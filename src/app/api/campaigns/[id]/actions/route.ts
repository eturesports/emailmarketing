import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { CAMPAIGN_STATUS, RECIPIENT_STATUS } from "@/lib/constants";
import { buildQueue, getPoolCapacity, processCampaign, sendTestEmail } from "@/lib/sender";

export const dynamic = "force-dynamic";
// El envío llama a la API de Gmail una vez por destinatario del primer lote.
export const maxDuration = 60;

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("cancelSchedule") }),
  z.object({ action: z.literal("schedule"), scheduledAt: z.string() }),
  z.object({ action: z.literal("test"), email: z.string() }),
  z.object({ action: z.literal("retryFailed") }),
]);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireApiUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { sender: true, lists: true },
    });
    if (!campaign) throw new ApiError(404, "La campaña no existe.");

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Acción no reconocida.");
    const body = parsed.data;

    switch (body.action) {
      case "test": {
        const email = normalizeEmail(body.email);
        if (!isValidEmail(email)) throw new ApiError(400, "Escribe una dirección de correo válida.");
        if (!campaign.subject.trim()) throw new ApiError(400, "La campaña necesita un asunto.");

        // Se usa un contacto real de la campaña para que las etiquetas de
        // combinación se vean con datos de verdad, no con marcadores.
        const sample = await prisma.recipient.findFirst({
          where: { campaignId: id },
          include: { contact: true },
        });

        await sendTestEmail(campaign, email, sample?.contact ?? null);
        return { ok: true, message: `Prueba enviada a ${email}.` };
      }

      case "send": {
        assertReadyToSend(campaign);
        const queue = await buildQueue(id);

        if (queue.total === 0) {
          throw new ApiError(400, "No hay destinatarios: las listas seleccionadas están vacías o todos están de baja.");
        }

        const capacity = await getPoolCapacity(id);
        const unusable = capacity.senders.filter((sender) => !sender.ready);

        // Si ninguna cuenta del grupo puede enviar, mejor decirlo ahora que
        // dejar la campaña en SENDING sin que salga un solo correo.
        if (capacity.senders.length > 0 && unusable.length === capacity.senders.length) {
          throw new ApiError(409, unusable.map((sender) => sender.reason).filter(Boolean).join(" "));
        }

        await prisma.campaign.update({
          where: { id },
          data: { status: CAMPAIGN_STATUS.SENDING, startedAt: new Date(), scheduledAt: null, lastError: null },
        });

        // Se procesa un primer lote de inmediato para que el usuario vea
        // movimiento al instante; el worker se encarga del resto.
        const result = await processCampaign(id);

        return {
          ok: true,
          queue,
          result,
          capacity,
          warning:
            capacity.totalRemaining < queue.total
              ? `La capacidad actual (${capacity.totalRemaining} envíos entre ${capacity.senders.length} cuenta(s)) no cubre los ${queue.total} destinatarios. El resto saldrá según se libere cuota. Para acabar antes, añade cuentas al grupo de remitentes o pásalas al relay SMTP.`
              : null,
        };
      }

      case "schedule": {
        assertReadyToSend(campaign);

        const scheduledAt = new Date(body.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime())) throw new ApiError(400, "La fecha programada no es válida.");
        if (scheduledAt.getTime() < Date.now() - 60_000) {
          throw new ApiError(400, "La fecha programada tiene que estar en el futuro.");
        }

        const queue = await buildQueue(id);
        if (queue.total === 0) {
          throw new ApiError(400, "No hay destinatarios: las listas seleccionadas están vacías o todos están de baja.");
        }

        await prisma.campaign.update({
          where: { id },
          data: { status: CAMPAIGN_STATUS.SCHEDULED, scheduledAt, lastError: null },
        });
        return { ok: true, queue, scheduledAt };
      }

      case "cancelSchedule": {
        if (campaign.status !== CAMPAIGN_STATUS.SCHEDULED) {
          throw new ApiError(409, "Esta campaña no está programada.");
        }
        await prisma.campaign.update({
          where: { id },
          data: { status: CAMPAIGN_STATUS.DRAFT, scheduledAt: null },
        });
        return { ok: true };
      }

      case "pause": {
        if (campaign.status !== CAMPAIGN_STATUS.SENDING) {
          throw new ApiError(409, "Sólo se puede pausar una campaña que se esté enviando.");
        }
        await prisma.campaign.update({ where: { id }, data: { status: CAMPAIGN_STATUS.PAUSED } });
        return { ok: true };
      }

      case "resume": {
        if (campaign.status !== CAMPAIGN_STATUS.PAUSED) {
          throw new ApiError(409, "Esta campaña no está pausada.");
        }
        await prisma.campaign.update({
          where: { id },
          data: { status: CAMPAIGN_STATUS.SENDING, lastError: null },
        });
        const result = await processCampaign(id);
        return { ok: true, result };
      }

      case "retryFailed": {
        const { count } = await prisma.recipient.updateMany({
          where: { campaignId: id, status: RECIPIENT_STATUS.FAILED },
          data: { status: RECIPIENT_STATUS.PENDING, attempts: 0, error: null },
        });
        if (count === 0) throw new ApiError(400, "No hay envíos fallidos que reintentar.");

        await prisma.campaign.update({
          where: { id },
          data: {
            status: CAMPAIGN_STATUS.SENDING,
            // El contador se recalcula desde cero al reintentar para que no
            // sume dos veces el mismo fallo si vuelve a fallar.
            failedCount: { decrement: count },
            completedAt: null,
            lastError: null,
          },
        });

        const result = await processCampaign(id);
        return { ok: true, retried: count, result };
      }
    }
  });
}

function assertReadyToSend(campaign: { status: string; subject: string; html: string; lists: unknown[] }): void {
  if (campaign.status === CAMPAIGN_STATUS.SENDING) throw new ApiError(409, "La campaña ya se está enviando.");
  if (campaign.status === CAMPAIGN_STATUS.SENT) throw new ApiError(409, "Esta campaña ya se envió.");
  if (!campaign.subject.trim()) throw new ApiError(400, "La campaña necesita un asunto.");
  if (!campaign.html.trim()) throw new ApiError(400, "La campaña necesita un contenido.");
  if (campaign.lists.length === 0) throw new ApiError(400, "Selecciona al menos una lista de contactos.");
}
