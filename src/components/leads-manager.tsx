"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Badge, Button, Card, CardHeader, Checkbox, Input, Select, Spinner, Table, Td, Textarea, Th } from "./ui";
import { IconCheck, IconAlert, IconPlus } from "./icons";
import { LEAD_AUDIENCE_LABELS, LEAD_STATUS_LABELS, type LeadAudience, type LeadStatus } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/utils";

type SourceView = {
  id: string;
  name: string;
  slug: string;
  audience: string;
  formIds: string[];
  listId: string | null;
  campaignId: string | null;
  campaign: { id: string; name: string; statusLabel: string; active: boolean; sentCount: number } | null;
  isActive: boolean;
  totalLeads: number;
  weekLeads: number;
};

type LeadView = {
  id: string;
  receivedAt: string;
  provider: string;
  status: string;
  sourceName: string | null;
  formId: string | null;
  adName: string | null;
  email: string | null;
  name: string | null;
  contactId: string | null;
  outcome: string | null;
  error: string | null;
};

type Config = {
  webhookUrl: string;
  apiUrl: string;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  hasAccessToken: boolean;
  hasApiKey: boolean;
  hasCron: boolean;
};

const STATUS_TONES: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  PROCESSED: "success",
  PENDING: "info",
  UNMATCHED: "warning",
  INVALID: "neutral",
  FAILED: "danger",
};

export function LeadsManager({
  isAdmin,
  config,
  sources,
  lists,
  automations,
  unmatchedForms,
  leads,
}: {
  isAdmin: boolean;
  config: Config;
  sources: SourceView[];
  lists: Array<{ id: string; name: string }>;
  automations: Array<{ id: string; name: string; statusLabel: string }>;
  unmatchedForms: Array<{ formId: string; count: number }>;
  leads: LeadView[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function call(key: string, url: string, init: RequestInit, success?: (payload: Record<string, unknown>) => string) {
    setBusy(key);
    setMessage(null);
    const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: String(payload.error ?? "No se ha podido completar la acción.") });
      return null;
    }
    if (success) setMessage({ tone: "success", text: success(payload) });
    router.refresh();
    return payload;
  }

  const metaReady = config.hasAppSecret && config.hasVerifyToken && config.hasAccessToken;

  return (
    <div className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {unmatchedForms.length > 0 ? (
        <Alert tone="warning" title="Formularios sin asignar">
          <p className="mb-3">
            Han llegado leads de formularios que no pertenecen a ningún origen. Dinos de quién son y se procesan al
            momento, con su correo de bienvenida.
          </p>
          <ul className="space-y-2">
            {unmatchedForms.map((form) => (
              <li key={form.formId} className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">{form.formId}</code>
                <span className="text-xs">({formatNumber(form.count)} lead/s)</span>
                {isAdmin
                  ? sources.map((source) => (
                      <Button
                        key={source.id}
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() =>
                          call(
                            `assign-${form.formId}`,
                            `/api/lead-sources/${source.id}`,
                            { method: "POST", body: JSON.stringify({ action: "assignForm", formId: form.formId }) },
                            (payload) => `Formulario asignado a «${source.name}». ${payload.reprocessed ?? 0} lead(s) procesados.`,
                          )
                        }
                      >
                        Es de {source.name}
                      </Button>
                    ))
                  : null}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            lists={lists}
            automations={automations}
            isAdmin={isAdmin}
            busy={busy}
            call={call}
          />
        ))}
        {isAdmin ? <NewSourceCard busy={busy} call={call} /> : null}
      </div>

      <Card>
        <CardHeader title="Últimos leads" description="Los 50 más recientes, con lo que se hizo con cada uno." />
        {leads.length === 0 ? (
          <p className="p-5 text-sm text-ink-faint">
            Todavía no ha llegado ningún lead. En cuanto alguien rellene un formulario de Meta, aparecerá aquí.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Recibido</Th>
                <Th>Persona</Th>
                <Th>Origen</Th>
                <Th>Estado</Th>
                <Th>Resultado</Th>
                <Th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line-soft last:border-0">
                  <Td className="whitespace-nowrap text-xs text-ink-muted">{formatDateTime(lead.receivedAt)}</Td>
                  <Td>
                    {lead.contactId ? (
                      <Link href={`/contactos/${lead.contactId}`} className="hover:text-brand">
                        {lead.name || <span className="italic text-ink-faint">Sin nombre</span>}
                      </Link>
                    ) : (
                      lead.name || <span className="italic text-ink-faint">Sin nombre</span>
                    )}
                    <span className="block text-xs text-ink-faint">{lead.email ?? "—"}</span>
                  </Td>
                  <Td className="text-xs">
                    {lead.sourceName ?? <span className="text-ink-faint">—</span>}
                    <span className="block text-ink-faint">
                      {lead.provider === "META" ? (lead.adName ?? (lead.formId ? `Formulario ${lead.formId}` : "Meta")) : "API"}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONES[lead.status] ?? "neutral"}>
                      {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                    </Badge>
                  </Td>
                  <Td className="max-w-xs text-xs text-ink-muted">{lead.error ?? lead.outcome ?? "—"}</Td>
                  <Td>
                    {lead.status === "FAILED" || lead.status === "PENDING" || lead.status === "UNMATCHED" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() =>
                          call(`retry-${lead.id}`, `/api/leads/${lead.id}`, { method: "POST" }, (payload) =>
                            String(payload.outcome ?? "Lead reprocesado."),
                          )
                        }
                      >
                        {busy === `retry-${lead.id}` ? <Spinner /> : "Reintentar"}
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Conexión con Meta"
          description="Los datos se configuran en el servidor (variables de entorno). El paso a paso está en el README."
          action={metaReady ? <Badge tone="success">Lista</Badge> : <Badge tone="warning">Incompleta</Badge>}
        />
        <div className="space-y-4 p-5 text-sm">
          <ul className="space-y-1.5">
            <Check ok={config.hasAppSecret} label="META_APP_SECRET" hint="Comprueba que cada aviso viene de verdad de Meta." />
            <Check ok={config.hasVerifyToken} label="META_VERIFY_TOKEN" hint="El mismo texto que pongas al suscribir el webhook." />
            <Check ok={config.hasAccessToken} label="META_ACCESS_TOKEN" hint="Token con permiso leads_retrieval para leer las respuestas." />
            <Check ok={config.hasCron} label="CRON_SECRET" hint="Para los seguimientos y para reintentar leads si Meta falla." />
            <Check ok={config.hasApiKey} label="LEADS_API_KEY" hint="Opcional: sólo para meter leads desde Zapier, Make, n8n…" />
          </ul>

          <div>
            <p className="label">URL del webhook (objeto «Page», campo «leadgen»)</p>
            <CopyField value={config.webhookUrl} />
          </div>
          <div>
            <p className="label">Endpoint genérico (Zapier, Make, n8n…)</p>
            <CopyField value={config.apiUrl} />
            <p className="mt-1 text-xs text-ink-faint">
              <code>POST</code> con <code>Authorization: Bearer LEADS_API_KEY</code> y{" "}
              <code>{`{ "source": "padres", "email": "…", "full_name": "…" }`}</code>. En <code>source</code> va el
              identificador del origen.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

type Call = (
  key: string,
  url: string,
  init: RequestInit,
  success?: (payload: Record<string, unknown>) => string,
) => Promise<Record<string, unknown> | null>;

function SourceCard({
  source,
  lists,
  automations,
  isAdmin,
  busy,
  call,
}: {
  source: SourceView;
  lists: Array<{ id: string; name: string }>;
  automations: Array<{ id: string; name: string; statusLabel: string }>;
  isAdmin: boolean;
  busy: string | null;
  call: Call;
}) {
  const [name, setName] = useState(source.name);
  const [audience, setAudience] = useState(source.audience);
  const [formIds, setFormIds] = useState(source.formIds.join("\n"));
  const [listId, setListId] = useState(source.listId ?? "");
  const [campaignId, setCampaignId] = useState(source.campaignId ?? "");
  const [isActive, setIsActive] = useState(source.isActive);

  const canBootstrap = !source.campaignId && (audience === "PARENT" || audience === "PLAYER");

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {source.name}
            {!source.isActive ? <Badge>Desactivado</Badge> : null}
          </span>
        }
        description={
          <>
            Identificador <code>{source.slug}</code> · {formatNumber(source.weekLeads)} leads esta semana ·{" "}
            {formatNumber(source.totalLeads)} en total
          </>
        }
      />
      <div className="space-y-4 p-5">
        {source.campaign ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
            <div className="min-w-0">
              <Link href={`/campanas/${source.campaign.id}`} className="font-medium hover:text-brand">
                {source.campaign.name}
              </Link>
              <p className="text-xs text-ink-faint">{formatNumber(source.campaign.sentCount)} correos enviados</p>
            </div>
            <Badge tone={source.campaign.active ? "success" : "warning"}>{source.campaign.statusLabel}</Badge>
          </div>
        ) : (
          <Alert tone="warning">Este origen todavía no tiene automatización: sus leads se guardan, pero no reciben nada.</Alert>
        )}

        {source.campaign && !source.campaign.active ? (
          <p className="text-xs text-warning">
            La automatización no está activa: los leads esperan en cola. Ábrela, revisa los correos y pulsa «Activar».
          </p>
        ) : null}

        {isAdmin ? (
          <>
            {canBootstrap ? (
              <Button
                type="button"
                className="w-full"
                disabled={busy !== null}
                onClick={() =>
                  call(
                    `bootstrap-${source.id}`,
                    `/api/lead-sources/${source.id}`,
                    { method: "POST", body: JSON.stringify({ action: "createAutomation" }) },
                    () => "Automatización creada en borrador con bienvenida y dos seguimientos. Revísala y actívala.",
                  )
                }
              >
                {busy === `bootstrap-${source.id}` ? <Spinner /> : <IconPlus size={16} />}
                Crear automatización con los correos de {audience === "PARENT" ? "padres" : "jugadores"}
              </Button>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`name-${source.id}`}>
                  Nombre
                </label>
                <Input id={`name-${source.id}`} value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor={`audience-${source.id}`}>
                  Público
                </label>
                <Select id={`audience-${source.id}`} value={audience} onChange={(event) => setAudience(event.target.value)}>
                  {Object.entries(LEAD_AUDIENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor={`forms-${source.id}`}>
                Formularios de Meta (IDs)
              </label>
              <Textarea
                id={`forms-${source.id}`}
                rows={3}
                value={formIds}
                onChange={(event) => setFormIds(event.target.value)}
                placeholder={"1234567890123456\n6543210987654321"}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Uno por línea. Lo ves en Meta Business Suite → Formularios instantáneos, o aquí arriba cuando llegue
                un lead sin asignar.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`list-${source.id}`}>
                  Lista
                </label>
                <Select id={`list-${source.id}`} value={listId} onChange={(event) => setListId(event.target.value)}>
                  <option value="">Ninguna</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label" htmlFor={`campaign-${source.id}`}>
                  Automatización
                </label>
                <Select
                  id={`campaign-${source.id}`}
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                >
                  <option value="">Ninguna</option>
                  {automations.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.statusLabel})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Checkbox
              label="Origen activo"
              description="Desactivado, los leads se guardan como contactos pero no reciben ningún correo."
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                call(
                  `save-${source.id}`,
                  `/api/lead-sources/${source.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      name,
                      audience,
                      metaFormIds: formIds,
                      listId: listId || null,
                      campaignId: campaignId || null,
                      isActive,
                    }),
                  },
                  (payload) =>
                    Number(payload.reprocessed ?? 0) > 0
                      ? `Guardado. ${payload.reprocessed} lead(s) que esperaban se han procesado.`
                      : "Guardado.",
                )
              }
            >
              {busy === `save-${source.id}` ? <Spinner /> : "Guardar"}
            </Button>
          </>
        ) : (
          <p className="text-xs text-ink-faint">
            {source.formIds.length} formulario(s) · Sólo un administrador puede cambiar la configuración.
          </p>
        )}
      </div>
    </Card>
  );
}

function NewSourceCard({ busy, call }: { busy: string | null; call: Call }) {
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<LeadAudience>("OTHER");

  return (
    <Card>
      <CardHeader title="Nuevo origen" description="Otro público con sus propios formularios y correos." />
      <form
        className="space-y-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await call(
            "create",
            "/api/lead-sources",
            { method: "POST", body: JSON.stringify({ name, audience }) },
            () => "Origen creado.",
          );
          if (result) setName("");
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Entrenadores" required />
        <Select value={audience} onChange={(event) => setAudience(event.target.value as LeadAudience)}>
          {Object.entries(LEAD_AUDIENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" className="w-full" disabled={busy !== null || !name.trim()}>
          {busy === "create" ? <Spinner /> : "Crear origen"}
        </Button>
      </form>
    </Card>
  );
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={ok ? "text-success" : "text-warning"}>{ok ? <IconCheck size={16} /> : <IconAlert size={16} />}</span>
      <span>
        <code className="text-xs">{label}</code>
        <span className="block text-xs text-ink-faint">{hint}</span>
      </span>
    </li>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} className="font-mono text-xs" onFocus={(event) => event.target.select()} />
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Sin permiso de portapapeles: el campo se puede seleccionar a mano.
          }
        }}
      >
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
