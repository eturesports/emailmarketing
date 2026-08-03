"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, CardHeader, ProgressBar, StatCard, Table, Td, Th } from "./ui";
import { IconCursor, IconEye, IconPause, IconPlay, IconSend } from "./icons";
import { CAMPAIGN_STATUS, RECIPIENT_STATUS_LABELS, type RecipientStatus } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPercent, rate } from "@/lib/utils";

export type ReportCampaign = {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  unsubCount: number;
  lastError: string | null;
};

export type RecipientRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  sentAt: string | null;
  openCount: number;
  clickCount: number;
  error: string | null;
};

export function CampaignReport({
  campaign,
  recipients,
  topLinks,
  pendingCount,
}: {
  campaign: ReportCampaign;
  recipients: RecipientRow[];
  topLinks: Array<{ url: string; clicks: number }>;
  pendingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const isSending = campaign.status === CAMPAIGN_STATUS.SENDING;

  // Mientras se está enviando, refrescar cada 15 s mantiene el progreso al día
  // sin necesidad de recargar a mano.
  useEffect(() => {
    if (!isSending) return;
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [isSending, router]);

  async function act(action: string) {
    setBusy(action);
    setError(null);

    const response = await fetch(`/api/campaigns/${campaign.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setBusy(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido completar la acción.");
      return;
    }
    router.refresh();
  }

  const visible = filter ? recipients.filter((recipient) => recipient.status === filter) : recipients;

  return (
    <div className="space-y-4">
      {campaign.lastError ? (
        <Alert tone="warning" title="Último aviso del envío">
          {campaign.lastError}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Enviados"
          value={formatNumber(campaign.sentCount)}
          sub={`de ${formatNumber(campaign.totalRecipients)} destinatarios`}
          icon={<IconSend size={16} />}
        />
        <StatCard
          label="Aperturas"
          value={campaign.sentCount ? formatPercent(rate(campaign.openCount, campaign.sentCount)) : "—"}
          sub={`${formatNumber(campaign.openCount)} contactos únicos`}
          tone="success"
          icon={<IconEye size={16} />}
        />
        <StatCard
          label="Clics"
          value={campaign.sentCount ? formatPercent(rate(campaign.clickCount, campaign.sentCount)) : "—"}
          sub={`${formatNumber(campaign.clickCount)} contactos únicos`}
          tone="brand"
          icon={<IconCursor size={16} />}
        />
        <StatCard
          label="Bajas"
          value={campaign.sentCount ? formatPercent(rate(campaign.unsubCount, campaign.sentCount)) : "—"}
          sub={`${formatNumber(campaign.unsubCount)} bajas · ${formatNumber(campaign.failedCount)} fallos`}
          tone={campaign.failedCount > 0 ? "warning" : "neutral"}
        />
      </div>

      {isSending || pendingCount > 0 ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {isSending ? "Enviando…" : "Envío pausado"}{" "}
                  <span className="text-xs font-normal text-ink-faint">
                    quedan {formatNumber(pendingCount)} en cola
                  </span>
                </span>
                <span className="tabular-nums text-xs text-ink-muted">
                  {formatNumber(campaign.sentCount)} / {formatNumber(campaign.totalRecipients)}
                </span>
              </div>
              <ProgressBar
                value={campaign.sentCount}
                max={campaign.totalRecipients}
                label="Progreso del envío"
                tone={isSending ? "brand" : "warning"}
              />
            </div>

            <div className="flex gap-2">
              {isSending ? (
                <Button variant="secondary" disabled={busy === "pause"} onClick={() => act("pause")}>
                  <IconPause size={15} />
                  Pausar
                </Button>
              ) : campaign.status === CAMPAIGN_STATUS.PAUSED ? (
                <Button disabled={busy === "resume"} onClick={() => act("resume")}>
                  <IconPlay size={15} />
                  Reanudar
                </Button>
              ) : null}
            </div>
          </div>

          {isSending ? (
            <p className="mt-3 text-xs text-ink-faint">
              El envío continúa en segundo plano aunque cierres esta página, al ritmo configurado y respetando la cuota
              diaria de Gmail.
            </p>
          ) : null}
        </Card>
      ) : null}

      {campaign.failedCount > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-muted">
            <strong className="text-danger">{formatNumber(campaign.failedCount)}</strong> envíos fallaron.
            Puedes volver a intentarlo con ellos.
          </p>
          <Button size="sm" variant="secondary" disabled={busy === "retryFailed"} onClick={() => act("retryFailed")}>
            Reintentar fallidos
          </Button>
        </Card>
      ) : null}

      {topLinks.length > 0 ? (
        <Card>
          <CardHeader title="Enlaces más pulsados" />
          <ul className="divide-y divide-line-soft">
            {topLinks.map((link) => (
              <li key={link.url} className="flex items-center justify-between gap-4 px-5 py-3">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-brand hover:underline"
                >
                  {link.url}
                </a>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  {formatNumber(link.clicks)} clic(s)
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Destinatarios"
          description={`Mostrando ${formatNumber(visible.length)} de ${formatNumber(campaign.totalRecipients)}.`}
          action={
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filtrar destinatarios por estado"
              className="field w-auto py-1 text-xs"
            >
              <option value="">Todos</option>
              {Object.entries(RECIPIENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          }
        />

        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No hay destinatarios con ese estado.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Contacto</Th>
                <Th>Estado</Th>
                <Th className="text-right">Aperturas</Th>
                <Th className="text-right">Clics</Th>
                <Th>Enviado</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((recipient) => (
                <tr key={recipient.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <span className="block truncate text-sm">{recipient.name || recipient.email}</span>
                    {recipient.name ? (
                      <span className="block truncate text-xs text-ink-faint">{recipient.email}</span>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        recipient.status === "SENT"
                          ? "success"
                          : recipient.status === "FAILED"
                            ? "danger"
                            : recipient.status === "SKIPPED"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {RECIPIENT_STATUS_LABELS[recipient.status as RecipientStatus] ?? recipient.status}
                    </Badge>
                    {recipient.error ? (
                      <span className="mt-1 block max-w-[280px] truncate text-[11px] text-danger">
                        {recipient.error}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-right text-sm tabular-nums">{recipient.openCount || "—"}</Td>
                  <Td className="text-right text-sm tabular-nums">{recipient.clickCount || "—"}</Td>
                  <Td className="text-xs text-ink-faint">{formatDateTime(recipient.sentAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {campaign.totalRecipients > recipients.length ? (
          <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            Se muestran los {formatNumber(recipients.length)} más recientes. Para el detalle completo, exporta los
            contactos desde{" "}
            <Link href="/contactos" className="text-brand hover:underline">
              Contactos
            </Link>
            .
          </p>
        ) : null}
      </Card>
    </div>
  );
}
