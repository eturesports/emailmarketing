import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCapacity } from "@/lib/quota";
import { transportReadiness } from "@/lib/transport";
import { TRANSPORT_LIMITS, type Transport } from "@/lib/constants";
import { CampaignEditor } from "@/components/campaign-editor";
import { CampaignReport } from "@/components/campaign-report";
import { PageHeader, StatusBadge } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  EVENT_TYPE,
  RECIPIENT_STATUS,
  type CampaignStatus,
} from "@/lib/constants";
import { parseCustomFields } from "@/lib/merge";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Campaña" };
export const dynamic = "force-dynamic";

/** Estados en los que la campaña todavía se puede editar. */
const EDITABLE = new Set<string>([CAMPAIGN_STATUS.DRAFT, CAMPAIGN_STATUS.SCHEDULED]);

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { lists: true, senders: true, steps: { orderBy: { position: "asc" } }, sender: true },
  });
  if (!campaign) notFound();

  const editable = EDITABLE.has(campaign.status);

  const header = (
    <>
      <Link
        href="/campanas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
      >
        <IconChevronLeft size={14} />
        Volver a campañas
      </Link>

      <PageHeader
        title={campaign.name}
        description={
          campaign.status === CAMPAIGN_STATUS.SCHEDULED && campaign.scheduledAt
            ? `Programada para el ${formatDateTime(campaign.scheduledAt)}`
            : campaign.completedAt
              ? `Enviada el ${formatDateTime(campaign.completedAt)}`
              : (campaign.subject || "Sin asunto")
        }
        action={
          <StatusBadge
            status={campaign.status}
            kind="campaign"
            label={CAMPAIGN_STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
          />
        }
      />
    </>
  );

  if (editable) {
    const [lists, senderAccounts, sampleContacts] = await Promise.all([
      prisma.contactList.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { memberships: true } } },
      }),
      prisma.sender.findMany({ where: { isActive: true }, orderBy: { label: "asc" }, include: { user: true } }),
      // Muestra pequeña sólo para ofrecer los campos personalizados como
      // botones de inserción en el editor.
      prisma.contact.findMany({ select: { customFields: true }, take: 50, orderBy: { updatedAt: "desc" } }),
    ]);

    // Capacidad restante de cada cuenta en la ventana móvil de 24 h, para poder
    // mostrar en el editor cuántos correos caben ahora mismo.
    const capacity = await getCapacity(senderAccounts);
    const senders = capacity.map((entry, index) => {
      const readiness = transportReadiness(senderAccounts[index]);
      const transport = entry.sender.transport as Transport;
      return {
        id: entry.sender.id,
        email: entry.sender.fromEmail,
        name: entry.sender.label,
        transportLabel: TRANSPORT_LIMITS[transport]?.label ?? transport,
        used: entry.used,
        limit: entry.limit,
        remaining: readiness.ready ? entry.remaining : 0,
        ready: readiness.ready,
        reason: readiness.reason ?? null,
      };
    });

    const customFieldKeys = [
      ...new Set(sampleContacts.flatMap((contact) => Object.keys(parseCustomFields(contact.customFields)))),
    ].slice(0, 12);

    return (
      <>
        {header}
        <CampaignEditor
          campaign={{
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            html: campaign.html,
            previewText: campaign.previewText,
            fromName: campaign.fromName,
            replyTo: campaign.replyTo,
            trackOpens: campaign.trackOpens,
            trackClicks: campaign.trackClicks,
            includeUnsubscribe: campaign.includeUnsubscribe,
            sendRatePerHour: campaign.sendRatePerHour,
            status: campaign.status,
            scheduledAt: campaign.scheduledAt ? toLocalInputValue(campaign.scheduledAt) : null,
            listIds: campaign.lists.map((entry) => entry.listId),
            senderIds: campaign.senders.map((entry) => entry.senderId),
            totalRecipients: campaign.totalRecipients,
          }}
          lists={lists.map((list) => ({
            id: list.id,
            name: list.name,
            color: list.color,
            contactCount: list._count.memberships,
          }))}
          senders={senders}
          steps={campaign.steps.map((step) => ({
            id: step.id,
            position: step.position,
            delayHours: step.delayHours,
            condition: step.condition,
            subject: step.subject,
            html: step.html,
            senderId: step.senderId,
            isActive: step.isActive,
          }))}
          customFieldKeys={customFieldKeys}
          senderEmail={campaign.sender.fromEmail}
        />
      </>
    );
  }

  const [recipients, pendingCount, clickEvents] = await Promise.all([
    prisma.recipient.findMany({
      where: { campaignId: id },
      include: { contact: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: [{ sentAt: "desc" }, { id: "asc" }],
      take: 200,
    }),
    prisma.recipient.count({
      where: { campaignId: id, status: { in: [RECIPIENT_STATUS.PENDING, RECIPIENT_STATUS.SENDING] } },
    }),
    prisma.event.groupBy({
      by: ["url"],
      where: { campaignId: id, type: EVENT_TYPE.CLICK, url: { not: null } },
      _count: { url: true },
      orderBy: { _count: { url: "desc" } },
      take: 8,
    }),
  ]);

  return (
    <>
      {header}
      <CampaignReport
        campaign={{
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalRecipients: campaign.totalRecipients,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          openCount: campaign.openCount,
          clickCount: campaign.clickCount,
          unsubCount: campaign.unsubCount,
          lastError: campaign.lastError,
        }}
        recipients={recipients.map((recipient) => ({
          id: recipient.id,
          email: recipient.contact.email,
          name: [recipient.contact.firstName, recipient.contact.lastName].filter(Boolean).join(" "),
          status: recipient.status,
          sentAt: recipient.sentAt?.toISOString() ?? null,
          openCount: recipient.openCount,
          clickCount: recipient.clickCount,
          error: recipient.error,
        }))}
        topLinks={clickEvents
          .filter((entry) => entry.url)
          .map((entry) => ({ url: entry.url!, clicks: entry._count.url }))}
        pendingCount={pendingCount}
      />
    </>
  );
}

/**
 * `<input type="datetime-local">` espera la hora local sin zona horaria, así
 * que se formatea manualmente en lugar de usar toISOString (que da UTC).
 */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
