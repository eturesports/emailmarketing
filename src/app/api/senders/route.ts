import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { aggregateCapacity, getCapacity } from "@/lib/quota";
import { transportReadiness, verifySmtpRelay } from "@/lib/transport";
import { TRANSPORT, TRANSPORT_LIMITS, type Transport } from "@/lib/constants";
import { hasResendApiKey } from "@/lib/settings";
import { encrypt } from "@/lib/crypto";
import { isValidEmail, normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Remitentes: las direcciones desde las que sale el correo.
 *
 * Un remitente no es un usuario. Una cuenta de Google puede tener varios alias
 * «enviar como» y cada uno es un remitente distinto; un remitente de Resend no
 * necesita cuenta de Google. Ver el modelo `Sender` en prisma/schema.prisma.
 */
export async function GET() {
  return handleApi(async () => {
    await requireApiUser();

    const senders = await prisma.sender.findMany({
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
      include: { user: true },
    });

    const capacity = await getCapacity(senders);

    const rows = capacity.map((entry, index) => {
      const sender = senders[index];
      const readiness = transportReadiness(sender);
      const transport = sender.transport as Transport;

      return {
        id: sender.id,
        label: sender.label,
        fromEmail: sender.fromEmail,
        fromName: sender.fromName,
        replyTo: sender.replyTo,
        transport,
        transportLabel: TRANSPORT_LIMITS[transport]?.label ?? transport,
        userEmail: sender.user?.email ?? null,
        smtpUser: sender.smtpUser,
        hasSmtpPassword: Boolean(sender.smtpPassword),
        isActive: sender.isActive,
        dailyQuota: sender.dailyQuota,
        sendRatePerHour: sender.sendRatePerHour,
        quotaKey: entry.quotaKey,
        used: entry.used,
        limit: entry.limit,
        remaining: readiness.ready ? entry.remaining : 0,
        ready: readiness.ready,
        reason: readiness.reason ?? null,
      };
    });

    const totals = aggregateCapacity(capacity.filter((_, index) => rows[index].isActive && rows[index].ready));

    return { senders: rows, totalRemaining: totals.remaining, totalLimit: totals.limit };
  });
}

const createSchema = z.object({
  label: z.string().min(1, "El remitente necesita un nombre.").max(120),
  fromEmail: z.string().min(3),
  fromName: z.string().max(120).nullable().optional(),
  replyTo: z.string().max(200).nullable().optional(),
  transport: z.enum(["GMAIL_API", "SMTP_RELAY", "RESEND"]),
  userId: z.string().nullable().optional(),
  smtpUser: z.string().max(200).nullable().optional(),
  smtpPassword: z.string().max(200).nullable().optional(),
  dailyQuota: z.number().int().min(1).max(5_000_000).optional(),
  sendRatePerHour: z.number().int().min(10).max(20_000).optional(),
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Los datos del remitente no son válidos.");
    }

    const data = parsed.data;
    const fromEmail = normalizeEmail(data.fromEmail);

    if (!isValidEmail(fromEmail)) throw new ApiError(400, "La dirección del remitente no es válida.");

    const clash = await prisma.sender.findUnique({ where: { fromEmail } });
    if (clash) throw new ApiError(409, "Ya existe un remitente con esa dirección.");

    await assertTransportUsable(data.transport, {
      userId: data.userId ?? user.id,
      smtpUser: data.smtpUser,
      smtpPassword: data.smtpPassword,
    });

    const sender = await prisma.sender.create({
      data: {
        label: data.label,
        fromEmail,
        fromName: data.fromName ?? null,
        replyTo: data.replyTo ?? null,
        transport: data.transport,
        // Gmail y el relay necesitan una cuenta de Google que autorice; Resend
        // no, porque la clave es de la organización.
        userId: data.transport === TRANSPORT.RESEND ? null : (data.userId ?? user.id),
        smtpUser: data.transport === TRANSPORT.SMTP_RELAY ? (data.smtpUser?.trim() ?? null) : null,
        smtpPassword:
          data.transport === TRANSPORT.SMTP_RELAY && data.smtpPassword?.trim()
            ? encrypt(data.smtpPassword.trim())
            : null,
        ...(data.dailyQuota !== undefined ? { dailyQuota: data.dailyQuota } : {}),
        ...(data.sendRatePerHour !== undefined ? { sendRatePerHour: data.sendRatePerHour } : {}),
      },
    });

    return { sender: { id: sender.id, label: sender.label, fromEmail: sender.fromEmail } };
  });
}

/**
 * Comprueba que el transporte elegido puede funcionar antes de guardar nada.
 *
 * Descubrir aquí que falta la clave de Resend o que el relay rechaza las
 * credenciales es mucho mejor que descubrirlo a mitad de una campaña.
 */
export async function assertTransportUsable(
  transport: string,
  options: { userId?: string | null; smtpUser?: string | null; smtpPassword?: string | null },
): Promise<void> {
  if (transport === TRANSPORT.RESEND) {
    if (!(await hasResendApiKey())) {
      throw new ApiError(400, "Resend no está configurado todavía. Añade la clave de API en Ajustes.");
    }
    return;
  }

  if (transport === TRANSPORT.SMTP_RELAY) {
    const username = options.smtpUser?.trim();
    const password = options.smtpPassword?.trim();

    if (!username) throw new ApiError(400, "Indica la cuenta de Workspace que se autentica en el relay.");
    if (!password) throw new ApiError(400, "Hace falta una contraseña de aplicación de Google para el relay.");

    try {
      await verifySmtpRelay(username, password);
    } catch (error) {
      throw new ApiError(
        400,
        `El relay SMTP ha rechazado las credenciales de ${username}. Comprueba que un administrador ha habilitado el relay en la consola de administración y que la contraseña es una «contraseña de aplicación». (${error instanceof Error ? error.message : "error desconocido"})`,
      );
    }
    return;
  }

  if (!options.userId) {
    throw new ApiError(400, "Un remitente por la API de Gmail necesita una cuenta de Google que lo autorice.");
  }

  const account = await prisma.user.findUnique({ where: { id: options.userId } });
  if (!account) throw new ApiError(404, "La cuenta de Google indicada no existe.");
  if (!account.refreshToken && !account.accessToken) {
    throw new ApiError(400, `${account.email} todavía no ha autorizado el acceso a Gmail.`);
  }
}
