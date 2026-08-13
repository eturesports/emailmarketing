import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSentInWindow, effectiveLimit } from "@/lib/quota";
import { TRANSPORT_LIMITS, type Transport } from "@/lib/constants";
import { CAMPAIGN_STATUS, CAMPAIGN_STATUS_LABELS, CONTACT_STATUS, type CampaignStatus } from "@/lib/constants";
import { formatNumber, formatPercent, formatRelative, rate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { IconCursor, IconEye, IconMail, IconPlus, IconUsers } from "@/components/icons";

export const metadata: Metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [
    totalContacts,
    subscribedContacts,
    unsubscribedContacts,
    totalLists,
    sentInWindow,
    senderPool,
    recentCampaigns,
    activeCampaigns,
    aggregate,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { status: CONTACT_STATUS.SUBSCRIBED } }),
    prisma.contact.count({ where: { status: CONTACT_STATUS.UNSUBSCRIBED } }),
    prisma.contactList.count(),
    getSentInWindow(user.id),
    prisma.user.findMany({ where: { isActive: true, canSend: true }, select: { transport: true, dailyQuota: true } }),
    prisma.campaign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { sender: { select: { name: true, email: true } } },
    }),
    prisma.campaign.findMany({
      where: { status: { in: [CAMPAIGN_STATUS.SENDING, CAMPAIGN_STATUS.SCHEDULED] } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.campaign.aggregate({
      where: { status: CAMPAIGN_STATUS.SENT },
      _sum: { sentCount: true, openCount: true, clickCount: true },
    }),
  ]);

  // Techo conjunto del dominio: Google limita por cuenta, así que la capacidad
  // real de una campaña grande es la suma de todas las cuentas del grupo.
  const poolCeiling = senderPool.reduce(
    (total, member) =>
      total + Math.min(TRANSPORT_LIMITS[member.transport as Transport]?.messagesPer24h ?? 0, member.dailyQuota),
    0,
  );

  const totalSent = aggregate._sum.sentCount ?? 0;
  const totalOpens = aggregate._sum.openCount ?? 0;
  const totalClicks = aggregate._sum.clickCount ?? 0;

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name?.split(" ")[0] ?? "equipo"}`}
        description="Estado de tus campañas y de la base de contactos de Eture."
        action={
          <LinkButton href="/campanas/nueva">
            <IconPlus size={16} />
            Nueva campaña
          </LinkButton>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Contactos activos"
          value={formatNumber(subscribedContacts)}
          sub={`${formatNumber(totalContacts)} en total · ${formatNumber(unsubscribedContacts)} de baja`}
          icon={<IconUsers size={16} />}
        />
        <StatCard
          label="Correos enviados"
          value={formatNumber(totalSent)}
          sub={`${formatNumber(totalLists)} listas de contactos`}
          icon={<IconMail size={16} />}
          tone="brand"
        />
        <StatCard
          label="Tasa de apertura"
          value={totalSent ? formatPercent(rate(totalOpens, totalSent)) : "—"}
          sub={`${formatNumber(totalOpens)} aperturas únicas`}
          icon={<IconEye size={16} />}
          tone="success"
        />
        <StatCard
          label="Tasa de clic"
          value={totalSent ? formatPercent(rate(totalClicks, totalSent)) : "—"}
          sub={`${formatNumber(totalClicks)} clics únicos`}
          icon={<IconCursor size={16} />}
          tone="warning"
        />
      </section>

      {activeCampaigns.length > 0 ? (
        <section className="mt-6">
          <Card>
            <CardHeader title="En marcha" description="Campañas enviándose ahora mismo o programadas." />
            <ul className="divide-y divide-line-soft">
              {activeCampaigns.map((campaign) => (
                <li key={campaign.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/campanas/${campaign.id}`}
                        className="text-sm font-medium text-ink hover:text-brand"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">{campaign.subject}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-ink-muted">
                        {formatNumber(campaign.sentCount)} / {formatNumber(campaign.totalRecipients)}
                      </span>
                      <StatusBadge
                        status={campaign.status}
                        kind="campaign"
                        label={CAMPAIGN_STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
                      />
                    </div>
                  </div>

                  {campaign.status === CAMPAIGN_STATUS.SENDING ? (
                    <div className="mt-3">
                      <ProgressBar
                        value={campaign.sentCount}
                        max={campaign.totalRecipients}
                        label={`Progreso de ${campaign.name}`}
                      />
                    </div>
                  ) : campaign.scheduledAt ? (
                    <p className="mt-2 text-xs text-ink-faint">
                      Se enviará {formatRelative(campaign.scheduledAt)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Campañas recientes"
            action={
              <Link href="/campanas" className="text-xs text-brand hover:underline">
                Ver todas
              </Link>
            }
          />
          {recentCampaigns.length === 0 ? (
            <EmptyState
              icon={<IconMail size={28} />}
              title="Todavía no hay campañas"
              description="Crea tu primera campaña, elige una lista de contactos y envíala desde tu cuenta de Gmail."
              action={
                <LinkButton href="/campanas/nueva" size="sm">
                  <IconPlus size={14} />
                  Crear campaña
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {recentCampaigns.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    href={`/campanas/${campaign.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{campaign.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {campaign.sender.name ?? campaign.sender.email} · {formatRelative(campaign.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {campaign.status === CAMPAIGN_STATUS.SENT ? (
                        <span className="hidden text-xs tabular-nums text-ink-muted sm:block">
                          {formatPercent(rate(campaign.openCount, campaign.sentCount), 0)} aperturas
                        </span>
                      ) : null}
                      <StatusBadge
                        status={campaign.status}
                        kind="campaign"
                        label={CAMPAIGN_STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Capacidad de envío</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Google limita por cuenta, no por dominio: el techo es la suma de las cuentas del grupo de remitentes.
            </p>

            <p className="mt-4 text-2xl font-semibold tabular-nums text-brand">{formatNumber(poolCeiling)}</p>
            <p className="text-xs text-ink-faint">
              correos cada 24 h entre {senderPool.length} cuenta(s)
            </p>

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-xs text-ink-muted">Tu cuenta</span>
                <span className="text-xs tabular-nums text-ink-faint">
                  {formatNumber(sentInWindow)} de {formatNumber(effectiveLimit(user))}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={sentInWindow}
                  max={effectiveLimit(user)}
                  tone={sentInWindow / Math.max(1, effectiveLimit(user)) > 0.85 ? "warning" : "brand"}
                  label="Cuota consumida en las últimas 24 h"
                />
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Ventana móvil de 24 h, no día natural. Súbelo con el relay SMTP o sumando cuentas en{" "}
                <Link href="/ajustes" className="text-brand hover:underline">
                  Ajustes
                </Link>
                .
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Atajos</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/importar" className="text-sm text-ink-muted hover:text-brand">
                → Importar contactos desde CSV o Excel
              </Link>
              <Link href="/listas" className="text-sm text-ink-muted hover:text-brand">
                → Crear una lista segmentada
              </Link>
              <Link href="/plantillas" className="text-sm text-ink-muted hover:text-brand">
                → Guardar una plantilla reutilizable
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Badge tone="brand">Consejo</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Personaliza el asunto con etiquetas como{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs text-brand">
                {"{{firstName}}"}
              </code>
              . Los correos con el nombre del destinatario en el asunto se abren notablemente más.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
