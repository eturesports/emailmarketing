import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, isAdmin, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import { ROLE, TRANSPORT, TRANSPORT_LIMITS } from "@/lib/constants";
import { encrypt } from "@/lib/crypto";
import { verifySmtpRelay } from "@/lib/transport";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  fromName: z.string().max(120).nullable().optional(),
  replyTo: z.string().max(200).nullable().optional(),
  signatureHtml: z.string().max(20_000).nullable().optional(),
  dailyQuota: z.number().int().min(1).max(10_000).optional(),
  sendRatePerHour: z.number().int().min(10).max(20_000).optional(),
  transport: z.enum(["GMAIL_API", "SMTP_RELAY"]).optional(),
  canSend: z.boolean().optional(),
  smtpUser: z.string().max(200).nullable().optional(),
  /** Contraseña de aplicación en claro; se verifica y se guarda cifrada. */
  smtpPassword: z.string().max(200).nullable().optional(),
});

/** Preferencias de envío del usuario que ha iniciado sesión. */
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los ajustes no son válidos.");

    if (parsed.data.replyTo && !isValidEmail(parsed.data.replyTo)) {
      throw new ApiError(400, "La dirección de respuesta no tiene un formato válido.");
    }

    const { smtpPassword, smtpUser, transport, ...fields } = parsed.data;

    const nextTransport = transport ?? (user.transport as "GMAIL_API" | "SMTP_RELAY");
    const nextSmtpUser = smtpUser !== undefined ? smtpUser : user.smtpUser;

    // Una contraseña vacía significa «no la cambies»: así el formulario puede
    // guardarse sin volver a escribirla cada vez.
    const changingPassword = typeof smtpPassword === "string" && smtpPassword.trim() !== "";

    if (nextTransport === TRANSPORT.SMTP_RELAY) {
      if (!nextSmtpUser?.trim()) {
        throw new ApiError(400, "Para usar el relay SMTP indica la cuenta de Workspace que se autentica.");
      }
      if (!changingPassword && !user.smtpPassword) {
        throw new ApiError(400, "Para usar el relay SMTP hace falta una contraseña de aplicación de Google.");
      }

      // Se comprueban las credenciales contra el relay antes de guardarlas: es
      // mucho mejor descubrir aquí que el administrador no ha habilitado el
      // relay que a mitad de una campaña de 10.000 correos.
      if (changingPassword) {
        try {
          await verifySmtpRelay(nextSmtpUser.trim(), smtpPassword!.trim());
        } catch (error) {
          throw new ApiError(
            400,
            `El relay SMTP ha rechazado las credenciales de ${nextSmtpUser}. Comprueba que un administrador ha habilitado el relay en la consola de administración y que la contraseña es una «contraseña de aplicación». (${error instanceof Error ? error.message : "error desconocido"})`,
          );
        }
      }
    }

    // El tope propio nunca debe superar lo que Google permite al transporte.
    const ceiling = TRANSPORT_LIMITS[nextTransport].messagesPer24h;
    const dailyQuota = fields.dailyQuota !== undefined ? Math.min(fields.dailyQuota, ceiling) : undefined;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...fields,
        ...(dailyQuota !== undefined ? { dailyQuota } : {}),
        ...(transport ? { transport } : {}),
        ...(smtpUser !== undefined ? { smtpUser: smtpUser?.trim() || null } : {}),
        ...(changingPassword ? { smtpPassword: encrypt(smtpPassword!.trim()) } : {}),
      },
    });

    return {
      user: {
        fromName: updated.fromName,
        replyTo: updated.replyTo,
        dailyQuota: updated.dailyQuota,
        sendRatePerHour: updated.sendRatePerHour,
        transport: updated.transport,
        canSend: updated.canSend,
        smtpUser: updated.smtpUser,
        hasSmtpPassword: Boolean(updated.smtpPassword),
      },
    };
  });
}

const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
  isActive: z.boolean().optional(),
});

/** Gestión del equipo: sólo administradores. */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();
    if (!isAdmin(user)) throw new ApiError(403, "Necesitas permisos de administrador.");

    const parsed = memberSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    const { userId, role, isActive } = parsed.data;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new ApiError(404, "El usuario no existe.");

    if (target.id === user.id && isActive === false) {
      throw new ApiError(400, "No puedes desactivar tu propia cuenta.");
    }
    // Sin esta comprobación, un administrador podría degradar al propietario y
    // dejar la instalación sin nadie capaz de gestionar el equipo.
    if (target.role === ROLE.OWNER && user.role !== ROLE.OWNER) {
      throw new ApiError(403, "Sólo el propietario puede modificar su propia cuenta.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });

    return { user: { id: updated.id, role: updated.role, isActive: updated.isActive } };
  });
}
