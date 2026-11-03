import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiAdmin } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { CAMPAIGN_KIND, LEAD_AUDIENCE } from "@/lib/constants";
import {
  assignFormToSource,
  createAutomationForSource,
  normalizeFormIds,
  parseFormIds,
  reprocessUnmatched,
} from "@/lib/leads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  audience: z.enum([LEAD_AUDIENCE.PARENT, LEAD_AUDIENCE.PLAYER, LEAD_AUDIENCE.OTHER]).optional(),
  metaFormIds: z.string().max(2000).optional(),
  listId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiAdmin();
    const { id } = await params;

    const source = await prisma.leadSource.findUnique({ where: { id } });
    if (!source) throw new ApiError(404, "El origen no existe.");

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");
    const body = parsed.data;

    if (body.campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: body.campaignId } });
      if (!campaign) throw new ApiError(400, "La campaña no existe.");
      if (campaign.kind !== CAMPAIGN_KIND.AUTOMATION) {
        throw new ApiError(400, "Sólo se puede asignar una automatización, no una campaña puntual.");
      }
    }
    if (body.listId && !(await prisma.contactList.findUnique({ where: { id: body.listId } }))) {
      throw new ApiError(400, "La lista no existe.");
    }

    let formIds: string[] | undefined;
    if (body.metaFormIds !== undefined) {
      formIds = normalizeFormIds(body.metaFormIds);
      // Un formulario sólo puede alimentar un origen: si no, no se sabría qué
      // correos mandarle.
      const others = await prisma.leadSource.findMany({ where: { id: { not: id } } });
      for (const other of others) {
        const clash = parseFormIds(other.metaFormIds).find((formId) => formIds!.includes(formId));
        if (clash) throw new ApiError(409, `El formulario ${clash} ya está asignado a «${other.name}».`);
      }
    }

    const updated = await prisma.leadSource.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        audience: body.audience,
        listId: body.listId,
        campaignId: body.campaignId,
        isActive: body.isActive,
        ...(formIds ? { metaFormIds: JSON.stringify(formIds) } : {}),
      },
    });

    // Leads que esperaban porque su formulario no estaba asignado a nadie.
    const reprocessed = formIds && formIds.length > 0 ? await reprocessForms(formIds) : 0;

    return { source: updated, reprocessed };
  });
}

async function reprocessForms(formIds: string[]): Promise<number> {
  let total = 0;
  for (const formId of formIds) total += (await reprocessUnmatched(formId)).length;
  return total;
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createAutomation") }),
  z.object({ action: z.literal("assignForm"), formId: z.string().regex(/^\d{5,30}$/) }),
]);

export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireApiAdmin();
    const { id } = await params;

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Acción no reconocida.");

    try {
      if (parsed.data.action === "createAutomation") {
        const campaign = await createAutomationForSource(id, user.id);
        return { campaign };
      }
      const results = await assignFormToSource(parsed.data.formId, id);
      return { reprocessed: results.length };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : "No se ha podido completar la acción.");
    }
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiAdmin();
    const { id } = await params;
    await prisma.leadSource.delete({ where: { id } });
    return { ok: true };
  });
}
