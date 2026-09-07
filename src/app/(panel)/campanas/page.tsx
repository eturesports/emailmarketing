import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, EmptyState, LinkButton, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { IconMail, IconPlus } from "@/components/icons";
import { CAMPAIGN_STATUS, CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/constants";
import { formatNumber, formatPercent, formatRelative, rate } from "@/lib/utils";

export const metadata: Metadata = { title: "Campañas" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "Todas" },
  { value: CAMPAIGN_STATUS.DRAFT, label: "Borradores" },
  { value: CAMPAIGN_STATUS.SCHEDULED, label: "Programadas" },
  { value: CAMPAIGN_STATUS.SENDING, label: "Enviando" },
  { value: CAMPAIGN_STATUS.SENT, label: "Enviadas" },
];

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const status = (await searchParams).status ?? "";

  const campaigns = await prisma.campaign.findMany({
    where: status ? { status } : {},
    orderBy: { updatedAt: "desc" },
    include: {
      sender: { select: { label: true, fromEmail: true } },
      lists: { include: { list: { select: { name: true, color: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Crea, programa y sigue los envíos de Eture."
        action={
          <LinkButton href="/campanas/nueva">
            <IconPlus size={16} />
            Nueva campaña
          </LinkButton>
        }
      />

      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Filtrar campañas">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={filter.value ? `/campanas?status=${filter.value}` : "/campanas"}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-lg bg-surface-3 px-3 py-1.5 text-xs font-medium text-ink"
                  : "rounded-lg px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-2"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconMail size={28} />}
            title={status ? "No hay campañas con ese estado" : "Todavía no has creado ninguna campaña"}
            description="Una campaña combina un contenido, unas listas de contactos y tu cuenta de Gmail como remitente."
            action={
              <LinkButton href="/campanas/nueva" size="sm">
                <IconPlus size={14} />
                Crear la primera campaña
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isSending = campaign.status === CAMPAIGN_STATUS.SENDING;
            const isSent = campaign.status === CAMPAIGN_STATUS.SENT;

            return (
              <Card key={campaign.id} className="transition-colors hover:border-brand-soft">
                <Link href={`/campanas/${campaign.id}`} className="block p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-ink">{campaign.name}</h2>
                        <StatusBadge
                          status={campaign.status}
                          kind="campaign"
                          label={CAMPAIGN_STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
                        />
                      </div>

                      <p className="mt-1 truncate text-sm text-ink-muted">
                        {campaign.subject || <span className="italic">Sin asunto</span>}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                        <span>{campaign.sender.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {campaign.scheduledAt && campaign.status === CAMPAIGN_STATUS.SCHEDULED
                            ? `Se envía ${formatRelative(campaign.scheduledAt)}`
                            : `Editada ${formatRelative(campaign.updatedAt)}`}
                        </span>
                        {campaign.lists.length > 0 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              {campaign.lists.slice(0, 2).map(({ list }, index) => (
                                <span key={index} className="inline-flex items-center gap-1">
                                  <span className="size-1.5 rounded-full" style={{ backgroundColor: list.color }} />
                                  {list.name}
                                </span>
                              ))}
                              {campaign.lists.length > 2 ? <span>+{campaign.lists.length - 2}</span> : null}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {isSent || isSending ? (
                      <dl className="flex shrink-0 gap-5 text-right">
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Enviados</dt>
                          <dd className="text-sm font-semibold tabular-nums">{formatNumber(campaign.sentCount)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Aperturas</dt>
                          <dd className="text-sm font-semibold tabular-nums text-success">
                            {campaign.sentCount ? formatPercent(rate(campaign.openCount, campaign.sentCount), 0) : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Clics</dt>
                          <dd className="text-sm font-semibold tabular-nums text-brand">
                            {campaign.sentCount ? formatPercent(rate(campaign.clickCount, campaign.sentCount), 0) : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>

                  {isSending ? (
                    <div className="mt-4">
                      <ProgressBar
                        value={campaign.sentCount}
                        max={campaign.totalRecipients}
                        label={`Progreso de ${campaign.name}`}
                      />
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {formatNumber(campaign.sentCount)} de {formatNumber(campaign.totalRecipients)} enviados
                      </p>
                    </div>
                  ) : null}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
