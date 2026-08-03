import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { buildMergeContext, findUnresolvedTags, renderTemplate } from "@/lib/merge";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Previsualiza la campaña con los datos de un destinatario real y avisa de las
 * etiquetas de combinación que quedarían vacías.
 */
export async function GET(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError(404, "La campaña no existe.");

    const index = Math.max(0, Number.parseInt(request.nextUrl.searchParams.get("i") ?? "0", 10) || 0);

    const recipients = await prisma.recipient.findMany({
      where: { campaignId: id },
      include: { contact: true },
      orderBy: { id: "asc" },
      take: 1,
      skip: index,
    });

    const total = await prisma.recipient.count({ where: { campaignId: id } });
    const contact = recipients[0]?.contact ?? null;

    if (!contact) {
      return {
        total: 0,
        index: 0,
        contact: null,
        subject: campaign.subject,
        html: campaign.html,
        unresolved: [] as string[],
      };
    }

    const context = buildMergeContext(contact);

    // Para el aviso se revisa una muestra de hasta 200 destinatarios: recorrer
    // la lista entera en cada previsualización sería innecesariamente caro.
    const sample = await prisma.recipient.findMany({
      where: { campaignId: id },
      include: { contact: true },
      take: 200,
    });
    const contexts = sample.map((entry) => buildMergeContext(entry.contact));
    const unresolved = [
      ...new Set([
        ...findUnresolvedTags(campaign.subject, contexts),
        ...findUnresolvedTags(campaign.html, contexts),
      ]),
    ];

    return {
      total,
      index,
      contact: { id: contact.id, email: contact.email, firstName: contact.firstName, lastName: contact.lastName },
      subject: renderTemplate(campaign.subject, context),
      html: renderTemplate(campaign.html, context, { escape: true }),
      unresolved,
    };
  });
}
