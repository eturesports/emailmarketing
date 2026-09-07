import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { RECIPIENT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  delayHours: z.number().int().min(1).max(24 * 90).optional(),
  condition: z.enum(["ALWAYS", "NO_OPEN", "NO_CLICK"]).optional(),
  subject: z.string().max(300).optional(),
  html: z.string().max(500_000).optional(),
  senderId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id, stepId } = await params;

    const step = await prisma.sequenceStep.findFirst({ where: { id: stepId, campaignId: id } });
    if (!step) throw new ApiError(404, "El seguimiento no existe.");

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos del seguimiento no son válidos.");

    // Los que ya salieron no se tocan: cambiar el contenido ahora falsearía el
    // histórico de lo que de verdad recibió la gente.
    const alreadySent = await prisma.recipient.count({
      where: { stepId, status: RECIPIENT_STATUS.SENT },
    });

    const touchesContent =
      parsed.data.subject !== undefined || parsed.data.html !== undefined || parsed.data.condition !== undefined;

    if (alreadySent > 0 && touchesContent) {
      throw new ApiError(
        409,
        `Este seguimiento ya se envió a ${alreadySent} contacto(s), así que su contenido y su condición no se pueden cambiar. Desactívalo y crea otro si necesitas un texto distinto.`,
      );
    }

    const updated = await prisma.sequenceStep.update({ where: { id: stepId }, data: parsed.data });
    return { step: updated };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id, stepId } = await params;

    const step = await prisma.sequenceStep.findFirst({ where: { id: stepId, campaignId: id } });
    if (!step) throw new ApiError(404, "El seguimiento no existe.");

    const sent = await prisma.recipient.count({ where: { stepId, status: RECIPIENT_STATUS.SENT } });
    if (sent > 0) {
      // Se desactiva en lugar de borrarse para no perder las estadísticas de
      // los correos que ya salieron.
      await prisma.sequenceStep.update({ where: { id: stepId }, data: { isActive: false } });
      return {
        ok: true,
        deactivated: true,
        message: `Este seguimiento ya se envió a ${sent} contacto(s): se ha desactivado en lugar de borrarse, para conservar sus estadísticas.`,
      };
    }

    await prisma.sequenceStep.delete({ where: { id: stepId } });

    // Se recolocan las posiciones para que no queden huecos en la secuencia.
    const rest = await prisma.sequenceStep.findMany({
      where: { campaignId: id },
      orderBy: { position: "asc" },
    });
    for (const [index, entry] of rest.entries()) {
      if (entry.position !== index + 1) {
        await prisma.sequenceStep.update({ where: { id: entry.id }, data: { position: index + 1 } });
      }
    }

    return { ok: true, deactivated: false };
  });
}
