import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { CAMPAIGN_KIND, LEAD_STATUS, campaignStatusLabel } from "@/lib/constants";
import { parseFormIds, personFromFields } from "@/lib/leads";
import { parseCustomFields } from "@/lib/merge";
import { PageHeader, StatCard } from "@/components/ui";
import { LeadsManager } from "@/components/leads-manager";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await requireUser();
  const dayAgo = new Date(Date.now() - 86_400_000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [sources, lists, automations, unmatched, recent, last24h, last7d, failing] = await Promise.all([
    prisma.leadSource.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        campaign: { select: { id: true, name: true, status: true, kind: true, sentCount: true } },
        _count: { select: { leads: true } },
      },
    }),
    prisma.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campaign.findMany({
      where: { kind: CAMPAIGN_KIND.AUTOMATION },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true, kind: true },
    }),
    prisma.lead.groupBy({
      by: ["formId"],
      where: { status: LEAD_STATUS.UNMATCHED, formId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: {
        source: { select: { name: true } },
        contact: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.lead.count({ where: { receivedAt: { gte: dayAgo } } }),
    prisma.lead.count({ where: { receivedAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { status: { in: [LEAD_STATUS.FAILED, LEAD_STATUS.UNMATCHED] } } }),
  ]);

  const weekly = await prisma.lead.groupBy({
    by: ["sourceId"],
    where: { receivedAt: { gte: weekAgo } },
    _count: { _all: true },
  });
  const weeklyBySource = new Map(weekly.map((entry) => [entry.sourceId, entry._count._all]));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Leads de Meta Ads: cada formulario alimenta un origen, y cada origen su propia automatización."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Últimas 24 h" value={formatNumber(last24h)} tone="brand" />
        <StatCard label="Últimos 7 días" value={formatNumber(last7d)} />
        <StatCard
          label="Requieren atención"
          value={formatNumber(failing)}
          tone={failing > 0 ? "warning" : "neutral"}
          sub="Sin asignar o con error"
        />
      </div>

      <LeadsManager
        isAdmin={isAdmin(user)}
        config={{
          webhookUrl: `${env.appUrl}/api/webhooks/meta`,
          apiUrl: `${env.appUrl}/api/leads`,
          hasAppSecret: Boolean(env.metaAppSecret),
          hasVerifyToken: Boolean(env.metaVerifyToken),
          hasAccessToken: Boolean(env.metaAccessToken),
          hasApiKey: Boolean(env.leadsApiKey),
          hasCron: Boolean(env.cronSecret),
        }}
        sources={sources.map((source) => ({
          id: source.id,
          name: source.name,
          slug: source.slug,
          audience: source.audience,
          formIds: parseFormIds(source.metaFormIds),
          listId: source.listId,
          campaignId: source.campaignId,
          campaign: source.campaign
            ? {
                id: source.campaign.id,
                name: source.campaign.name,
                statusLabel: campaignStatusLabel(source.campaign.status, source.campaign.kind),
                active: source.campaign.status === "SENDING",
                sentCount: source.campaign.sentCount,
              }
            : null,
          isActive: source.isActive,
          totalLeads: source._count.leads,
          weekLeads: weeklyBySource.get(source.id) ?? 0,
        }))}
        lists={lists}
        automations={automations.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          statusLabel: campaignStatusLabel(campaign.status, campaign.kind),
        }))}
        unmatchedForms={unmatched
          .filter((entry) => entry.formId)
          .map((entry) => ({ formId: entry.formId!, count: entry._count._all }))}
        leads={recent.map((lead) => {
          const person = personFromFields(parseCustomFields(lead.fields));
          return {
            id: lead.id,
            receivedAt: lead.receivedAt.toISOString(),
            provider: lead.provider,
            status: lead.status,
            sourceName: lead.source?.name ?? null,
            formId: lead.formId,
            adName: lead.adName,
            email: lead.contact?.email ?? person.email,
            name:
              [lead.contact?.firstName ?? person.firstName, lead.contact?.lastName ?? person.lastName]
                .filter(Boolean)
                .join(" ") || null,
            contactId: lead.contact?.id ?? null,
            outcome: lead.outcome,
            error: lead.error,
          };
        })}
      />
    </>
  );
}
