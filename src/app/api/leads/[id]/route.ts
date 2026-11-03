import { type NextRequest } from "next/server";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { retryLead } from "@/lib/leads";
import { processCampaign } from "@/lib/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** Reintenta un lead fallido o sin asignar. */
export async function POST(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    if (!(await prisma.lead.findUnique({ where: { id } }))) throw new ApiError(404, "El lead no existe.");

    const result = await retryLead(id);
    if (result.enrolledCampaignId) await processCampaign(result.enrolledCampaignId, 10);
    return result;
  });
}
