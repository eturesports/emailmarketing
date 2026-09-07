import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { assertTransportUsable } from "../route";
import { TRANSPORT } from "@/lib/constants";
import { encrypt } from "@/lib/crypto";
import { CAMPAIGN_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  label: z.string().min(1).max(120).optional(),
  fromName: z.string().max(120).nullable().optional(),
  replyTo: z.string().max(200).nullable().optional(),
  transport: z.enum(["GMAIL_API", "SMTP_RELAY", "RESEND"]).optional(),
  userId: z.string().nullable().optional(),
  smtpUser: z.string().max(200).nullable().optional(),
  /** Vacío = no cambiarla. */
  smtpPassword: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
  dailyQuota: z.number().int().min(1).max(5_000_000).optional(),
  sendRatePerHour: z.number().int().min(10).max(20_000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const sender = await prisma.sender.findUnique({ where: { id } });
    if (!sender) throw new ApiError(404, "El remitente no existe.");

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos del remitente no son válidos.");

    const data = parsed.data;
    const transport = data.transport ?? sender.transport;
    const smtpUser = data.smtpUser !== undefined ? data.smtpUser : sender.smtpUser;
    const changingPassword = typeof data.smtpPassword === "string" && data.smtpPassword.trim() !== "";

    // Sólo se revalida si cambia algo que afecte a la conexión: verificar el
    // relay en cada guardado añadiría segundos a cambios triviales.
    const touchesTransport =
      data.transport !== undefined || data.userId !== undefined || data.smtpUser !== undefined || changingPassword;

    if (touchesTransport) {
      await assertTransportUsable(transport, {
        userId: data.userId !== undefined ? data.userId : sender.userId,
        smtpUser,
        // Si no se cambia la contraseña, se da por buena la ya verificada.
        smtpPassword: changingPassword ? data.smtpPassword : "ya-verificada",
      });
    }

    const updated = await prisma.sender.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.fromName !== undefined ? { fromName: data.fromName } : {}),
        ...(data.replyTo !== undefined ? { replyTo: data.replyTo } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.dailyQuota !== undefined ? { dailyQuota: data.dailyQuota } : {}),
        ...(data.sendRatePerHour !== undefined ? { sendRatePerHour: data.sendRatePerHour } : {}),
        ...(data.transport !== undefined ? { transport } : {}),
        ...(data.userId !== undefined ? { userId: transport === TRANSPORT.RESEND ? null : data.userId } : {}),
        ...(data.smtpUser !== undefined ? { smtpUser: smtpUser?.trim() || null } : {}),
        ...(changingPassword ? { smtpPassword: encrypt(data.smtpPassword!.trim()) } : {}),
      },
    });

    return { sender: { id: updated.id, label: updated.label, isActive: updated.isActive } };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const sender = await prisma.sender.findUnique({
      where: { id },
      include: { _count: { select: { campaignsOwned: true, recipients: true } } },
    });
    if (!sender) throw new ApiError(404, "El remitente no existe.");

    const sending = await prisma.campaign.count({
      where: {
        status: { in: [CAMPAIGN_STATUS.SENDING, CAMPAIGN_STATUS.SCHEDULED] },
        OR: [{ senderId: id }, { senders: { some: { senderId: id } } }],
      },
    });
    if (sending > 0) {
      throw new ApiError(409, `No se puede borrar: hay ${sending} campaña(s) en curso o programadas que lo usan.`);
    }

    // Borrarlo dejaría campañas enviadas sin remitente y perdería el histórico;
    // desactivarlo lo saca del reparto sin romper nada.
    if (sender._count.campaignsOwned > 0 || sender._count.recipients > 0) {
      const updated = await prisma.sender.update({ where: { id }, data: { isActive: false } });
      return {
        ok: true,
        deactivated: true,
        message: `${updated.fromEmail} ya ha enviado correos, así que se ha desactivado en lugar de borrarse: así se conserva el histórico de esas campañas.`,
      };
    }

    await prisma.sender.delete({ where: { id } });
    return { ok: true, deactivated: false };
  });
}
