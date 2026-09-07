import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { MAX_SEQUENCE_STEPS, SEQUENCE_CONDITION } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  delayHours: z.number().int().min(1).max(24 * 90).optional(),
  condition: z.enum(["ALWAYS", "NO_OPEN", "NO_CLICK"]).optional(),
  subject: z.string().max(300).optional(),
  html: z.string().max(500_000).optional(),
  senderId: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Añade un paso de seguimiento al final de la secuencia. */
export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { steps: true } } },
    });
    if (!campaign) throw new ApiError(404, "La campaña no existe.");

    if (campaign._count.steps >= MAX_SEQUENCE_STEPS) {
      throw new ApiError(
        400,
        `Una campaña admite como mucho ${MAX_SEQUENCE_STEPS} seguimientos. Más que eso deja de ser insistencia y empieza a ser spam.`,
      );
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "Los datos del seguimiento no son válidos.");

    const last = await prisma.sequenceStep.findFirst({
      where: { campaignId: id },
      orderBy: { position: "desc" },
    });

    // Cada paso espera más que el anterior: si el primero sale a los 3 días, el
    // segundo por defecto sale 3 días después de ese, no a la vez.
    const position = (last?.position ?? 0) + 1;
    const delayHours = parsed.data.delayHours ?? (last ? last.delayHours + 72 : 72);

    const step = await prisma.sequenceStep.create({
      data: {
        campaignId: id,
        position,
        delayHours,
        condition: parsed.data.condition ?? SEQUENCE_CONDITION.NO_OPEN,
        subject: parsed.data.subject ?? "",
        html: parsed.data.html ?? DEFAULT_FOLLOWUP_HTML,
        senderId: parsed.data.senderId ?? null,
      },
    });

    return { step };
  });
}

const DEFAULT_FOLLOWUP_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;">
  <p>Hola {{firstName | equipo}},</p>
  <p>Te escribo por si el correo anterior se te pasó.</p>
  <p>Un saludo,<br />El equipo de Eture Esports</p>
</div>`;
