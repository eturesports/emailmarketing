import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { CAMPAIGN_STATUS } from "@/lib/constants";
import { buildQueue } from "@/lib/sender";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(160).optional(),
  subject: z.string().max(300).optional(),
  html: z.string().max(500_000).optional(),
  previewText: z.string().max(300).nullable().optional(),
  fromName: z.string().max(120).nullable().optional(),
  replyTo: z.string().max(200).nullable().optional(),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  includeUnsubscribe: z.boolean().optional(),
  sendRatePerHour: z.number().int().min(10).max(20000).optional(),
  listIds: z.array(z.string()).optional(),
  /** Cuentas que se reparten el envío. Vacío = sólo quien creó la campaña. */
  senderIds: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Estados en los que el contenido de la campaña todavía se puede editar. */
const EDITABLE = new Set<string>([CAMPAIGN_STATUS.DRAFT, CAMPAIGN_STATUS.SCHEDULED, CAMPAIGN_STATUS.PAUSED]);

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError(404, "La campaña no existe.");

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    const { listIds, senderIds, ...fields } = parsed.data;

    // Cambiar el contenido de una campaña ya enviada falsearía el histórico:
    // lo que quedó en los buzones no se puede reescribir.
    const touchesContent = Object.keys(fields).length > 0 || listIds !== undefined || senderIds !== undefined;
    if (touchesContent && !EDITABLE.has(campaign.status)) {
      throw new ApiError(409, "Esta campaña ya se está enviando o se ha enviado, así que no se puede editar.");
    }

    if (senderIds) {
      // Sólo pueden repartirse la campaña cuentas activas y habilitadas para
      // enviar; si no se filtrase, una cuenta desactivada bloquearía su turno.
      const usable = await prisma.user.findMany({
        where: { id: { in: senderIds }, isActive: true, canSend: true },
        select: { id: true },
      });

      await prisma.campaignSender.deleteMany({ where: { campaignId: id } });
      if (usable.length > 0) {
        await prisma.campaignSender.createMany({
          data: usable.map((user) => ({ campaignId: id, userId: user.id })),
        });
      }
    }

    if (listIds) {
      await prisma.campaignList.deleteMany({ where: { campaignId: id } });
      if (listIds.length > 0) {
        await prisma.campaignList.createMany({ data: listIds.map((listId) => ({ campaignId: id, listId })) });
      }
      // Recalcular la cola mantiene actualizado el recuento de destinatarios
      // que se muestra antes de enviar.
      await buildQueue(id);
    }

    const updated = await prisma.campaign.update({ where: { id }, data: fields });
    return { campaign: updated };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError(404, "La campaña no existe.");

    if (campaign.status === CAMPAIGN_STATUS.SENDING) {
      throw new ApiError(409, "Pausa la campaña antes de borrarla.");
    }

    await prisma.campaign.delete({ where: { id } });
    return { ok: true };
  });
}
