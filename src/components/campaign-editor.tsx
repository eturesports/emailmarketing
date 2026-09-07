"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select, Spinner } from "./ui";
import { IconEye, IconSend, IconTrash } from "./icons";
import { MERGE_FIELDS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export type EditableCampaign = {
  id: string;
  name: string;
  subject: string;
  html: string;
  previewText: string | null;
  fromName: string | null;
  replyTo: string | null;
  trackOpens: boolean;
  trackClicks: boolean;
  includeUnsubscribe: boolean;
  sendRatePerHour: number;
  status: string;
  scheduledAt: string | null;
  listIds: string[];
  senderIds: string[];
  totalRecipients: number;
};

type ListOption = { id: string; name: string; color: string; contactCount: number };

export type SenderOption = {
  id: string;
  email: string;
  name: string | null;
  transportLabel: string;
  used: number;
  limit: number;
  remaining: number;
  ready: boolean;
  reason: string | null;
};

type Tab = "contenido" | "destinatarios" | "remitentes" | "ajustes";

export function CampaignEditor({
  campaign: initial,
  lists,
  senders,
  customFieldKeys,
  senderEmail,
}: {
  campaign: EditableCampaign;
  lists: ListOption[];
  senders: SenderOption[];
  customFieldKeys: string[];
  senderEmail: string;
}) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const [campaign, setCampaign] = useState(initial);
  const [tab, setTab] = useState<Tab>("contenido");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "warning" | "info"; text: string } | null>(
    null,
  );
  const [testEmail, setTestEmail] = useState(senderEmail);
  const [scheduleAt, setScheduleAt] = useState(initial.scheduledAt ?? "");
  const [showPreview, setShowPreview] = useState(false);

  const reach = useMemo(
    () =>
      lists.filter((list) => campaign.listIds.includes(list.id)).reduce((total, list) => total + list.contactCount, 0),
    [lists, campaign.listIds],
  );

  // Si no se elige ninguna cuenta, envía sólo quien creó la campaña. El techo
  // de la campaña es la suma de lo que le queda a cada cuenta del grupo: el
  // límite de Google es por cuenta, así que sumar cuentas sube el techo.
  const activePool = useMemo(() => {
    const chosen = senders.filter((sender) => campaign.senderIds.includes(sender.id));
    if (chosen.length > 0) return chosen;
    return senders.filter((sender) => sender.email === senderEmail);
  }, [senders, campaign.senderIds, senderEmail]);

  const poolRemaining = activePool.reduce((total, sender) => total + sender.remaining, 0);
  const poolLimit = activePool.reduce((total, sender) => total + (sender.ready ? sender.limit : 0), 0);
  const notReady = activePool.filter((sender) => !sender.ready);

  // Aviso del navegador si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof EditableCampaign>(key: K, value: EditableCampaign[K]) {
    setCampaign((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function toggleSender(id: string) {
    update(
      "senderIds",
      campaign.senderIds.includes(id)
        ? campaign.senderIds.filter((value) => value !== id)
        : [...campaign.senderIds, id],
    );
  }

  function toggleList(id: string) {
    update(
      "listIds",
      campaign.listIds.includes(id) ? campaign.listIds.filter((value) => value !== id) : [...campaign.listIds, id],
    );
  }

  /** Inserta una etiqueta de combinación donde esté el cursor del editor. */
  function insertTag(tag: string) {
    const textarea = htmlRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const snippet = `{{${tag}}}`;
    const next = campaign.html.slice(0, start) + snippet + campaign.html.slice(end);

    update("html", next);

    // Devolver el foco y dejar el cursor tras la etiqueta permite seguir
    // escribiendo sin tocar el ratón.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function save(silent = false): Promise<boolean> {
    setSaving(true);
    if (!silent) setMessage(null);

    const response = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campaign.name,
        subject: campaign.subject,
        html: campaign.html,
        previewText: campaign.previewText || null,
        fromName: campaign.fromName || null,
        replyTo: campaign.replyTo || null,
        trackOpens: campaign.trackOpens,
        trackClicks: campaign.trackClicks,
        includeUnsubscribe: campaign.includeUnsubscribe,
        sendRatePerHour: campaign.sendRatePerHour,
        listIds: campaign.listIds,
        senderIds: campaign.senderIds,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se han podido guardar los cambios." });
      return false;
    }

    setDirty(false);
    if (!silent) setMessage({ tone: "success", text: "Cambios guardados." });
    router.refresh();
    return true;
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    // Guardar antes de actuar evita enviar una versión distinta de la que se
    // está viendo en pantalla.
    if (dirty && !(await save(true))) return;

    setBusy(action);
    setMessage(null);

    const response = await fetch(`/api/campaigns/${campaign.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido completar la acción." });
      return;
    }

    if (action === "test") {
      setMessage({ tone: "success", text: payload.message ?? "Prueba enviada." });
      return;
    }
    if (payload.warning) {
      setMessage({ tone: "warning", text: payload.warning });
    }

    router.refresh();
  }

  async function remove() {
    if (!confirm(`¿Borrar la campaña "${campaign.name}"?`)) return;

    const response = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    if (response.ok) router.push("/campanas");
    else setMessage({ tone: "danger", text: "No se ha podido borrar la campaña." });
  }

  const canSend = campaign.subject.trim() && campaign.html.trim() && campaign.listIds.length > 0;
  const isScheduled = campaign.status === "SCHEDULED";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <nav className="flex gap-1 rounded-lg border border-line bg-surface p-1" role="tablist">
          {(["contenido", "destinatarios", "remitentes", "ajustes"] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                tab === value
                  ? "bg-surface-3 font-medium text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {value}
            </button>
          ))}
        </nav>

        {tab === "contenido" ? (
          <Card>
            <CardHeader
              title="Contenido del correo"
              action={
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPreview((value) => !value)}>
                  <IconEye size={15} />
                  {showPreview ? "Editar" : "Previsualizar"}
                </Button>
              }
            />

            <div className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="name">
                  Nombre interno
                </label>
                <Input id="name" value={campaign.name} onChange={(event) => update("name", event.target.value)} />
              </div>

              <div>
                <label className="label" htmlFor="subject">
                  Asunto
                </label>
                <Input
                  id="subject"
                  value={campaign.subject}
                  onChange={(event) => update("subject", event.target.value)}
                  placeholder="{{firstName}}, novedades de Eture"
                />
              </div>

              <div>
                <label className="label" htmlFor="previewText">
                  Texto de vista previa
                </label>
                <Input
                  id="previewText"
                  value={campaign.previewText ?? ""}
                  onChange={(event) => update("previewText", event.target.value)}
                  placeholder="La línea que se ve en la bandeja tras el asunto"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="label mb-0 mr-1">Insertar</span>
                  {MERGE_FIELDS.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => insertTag(field.key)}
                      className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-brand transition-colors hover:bg-surface-3"
                    >
                      {field.label}
                    </button>
                  ))}
                  {customFieldKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => insertTag(key)}
                      className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-info transition-colors hover:bg-surface-3"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {showPreview ? (
                  <div className="overflow-hidden rounded-lg border border-line">
                    <iframe
                      title="Vista previa del correo"
                      // El HTML del correo se aísla en un iframe con sandbox:
                      // así no puede ejecutar scripts ni heredar los estilos
                      // del panel, y se ve como lo verá el destinatario.
                      sandbox=""
                      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#fff;font-family:Arial,Helvetica,sans-serif;}</style></head><body>${campaign.html}</body></html>`}
                      className="h-[460px] w-full bg-white"
                    />
                  </div>
                ) : (
                  <textarea
                    ref={htmlRef}
                    id="html"
                    value={campaign.html}
                    onChange={(event) => update("html", event.target.value)}
                    spellCheck={false}
                    className="field h-[460px] resize-y font-mono text-xs leading-relaxed"
                    aria-label="Contenido HTML del correo"
                  />
                )}

                <p className="mt-2 text-xs text-ink-faint">
                  Escribe HTML. Usa{" "}
                  <code className="rounded bg-surface-3 px-1 font-mono">{"{{firstName | equipo}}"}</code> para
                  dar un valor por defecto cuando el campo esté vacío.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {tab === "destinatarios" ? (
          <Card>
            <CardHeader
              title="Listas de destinatarios"
              description="Un contacto que esté en varias listas recibe un único correo."
            />
            <div className="space-y-1.5 p-5">
              {lists.length === 0 ? (
                <p className="text-sm text-ink-faint">Todavía no hay listas de contactos.</p>
              ) : (
                lists.map((list) => {
                  const checked = campaign.listIds.includes(list.id);
                  return (
                    <label
                      key={list.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors ${
                        checked ? "border-brand-soft bg-[#0b1f27]" : "border-line"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleList(list.id)}
                        className="size-4 shrink-0 rounded border-line bg-surface-2 accent-brand"
                      />
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: list.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm">{list.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                        {formatNumber(list.contactCount)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="border-t border-line px-5 py-3 text-sm">
              Alcance: <strong>{formatNumber(reach)}</strong>{" "}
              <span className="text-xs text-ink-faint">
                (antes de descartar duplicados y contactos de baja)
              </span>
            </div>
          </Card>
        ) : null}

        {tab === "remitentes" ? (
          <Card>
            <CardHeader
              title="Cuentas que envían esta campaña"
              description="Google limita el envío por cuenta, no por dominio: repartir la campaña entre varias cuentas multiplica el techo diario."
            />

            <div className="space-y-1.5 p-5">
              {senders.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  No hay cuentas disponibles. Cada miembro del equipo aparece aquí tras iniciar sesión.
                </p>
              ) : (
                senders.map((sender) => {
                  const checked = campaign.senderIds.includes(sender.id);
                  const percent = sender.limit > 0 ? Math.min(100, (sender.used / sender.limit) * 100) : 0;

                  return (
                    <label
                      key={sender.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        checked ? "border-brand-soft bg-[#0b1f27]" : "border-line"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSender(sender.id)}
                        className="mt-0.5 size-4 shrink-0 rounded border-line bg-surface-2 accent-[#22d3ee]"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{sender.name ?? sender.email}</span>
                          <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                            {formatNumber(sender.remaining)} disponibles
                          </span>
                        </span>

                        <span className="mt-0.5 block truncate text-xs text-ink-faint">
                          {sender.email} · {sender.transportLabel}
                        </span>

                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className={`block h-full rounded-full ${percent > 85 ? "bg-warning" : "bg-brand"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="mt-1 block text-[11px] text-ink-faint">
                          {formatNumber(sender.used)} de {formatNumber(sender.limit)} usados en las últimas 24 h
                        </span>

                        {!sender.ready && sender.reason ? (
                          <span className="mt-1.5 block text-[11px] text-warning">{sender.reason}</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-ink-muted">Capacidad de la campaña ahora mismo</span>
                <span className="text-lg font-semibold tabular-nums text-brand">
                  {formatNumber(poolRemaining)} correos
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                Techo conjunto de {formatNumber(poolLimit)} cada 24 h con {activePool.length} cuenta(s).
                {campaign.senderIds.length === 0
                  ? " Sin selección envía sólo quien creó la campaña."
                  : ""}
              </p>
              {reach > poolRemaining ? (
                <div className="mt-3">
                  <Alert tone="info">
                    Los {formatNumber(reach)} destinatarios no caben en la capacidad actual: se enviarán{" "}
                    {formatNumber(poolRemaining)} ahora y el resto según se libere cuota. Añade más cuentas al grupo
                    para acabar antes.
                  </Alert>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {tab === "ajustes" ? (
          <Card>
            <CardHeader title="Ajustes de envío" />
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="fromName">
                    Nombre del remitente
                  </label>
                  <Input
                    id="fromName"
                    value={campaign.fromName ?? ""}
                    onChange={(event) => update("fromName", event.target.value)}
                    placeholder="Eture Esports"
                  />
                  <p className="mt-1 text-xs text-ink-faint">Se enviará desde {senderEmail}.</p>
                </div>
                <div>
                  <label className="label" htmlFor="replyTo">
                    Responder a
                  </label>
                  <Input
                    id="replyTo"
                    type="email"
                    value={campaign.replyTo ?? ""}
                    onChange={(event) => update("replyTo", event.target.value)}
                    placeholder="marketing@eturesports.com"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="rate">
                  Ritmo de envío
                </label>
                <Select
                  id="rate"
                  value={String(campaign.sendRatePerHour)}
                  onChange={(event) => update("sendRatePerHour", Number(event.target.value))}
                >
                  <option value="60">Lento — 60 correos/hora</option>
                  <option value="150">Moderado — 150 correos/hora</option>
                  <option value="300">Normal — 300 correos/hora</option>
                  <option value="600">Rápido — 600 correos/hora</option>
                  <option value="1200">Muy rápido — 1.200 correos/hora</option>
                  <option value="2500">Intensivo — 2.500 correos/hora</option>
                  <option value="5000">Masivo — 5.000 correos/hora</option>
                </Select>
                <p className="mt-1 text-xs text-ink-faint">
                  Ritmo conjunto de todas las cuentas de la campaña. Enviar despacio mejora la entregabilidad; los
                  ritmos altos sólo tienen sentido si el grupo de remitentes es amplio.
                </p>
              </div>

              <div className="space-y-2.5 border-t border-line pt-4">
                <Checkbox
                  label="Registrar aperturas"
                  description="Inserta un píxel invisible. Algunos clientes de correo lo bloquean."
                  checked={campaign.trackOpens}
                  onChange={(event) => update("trackOpens", event.target.checked)}
                />
                <Checkbox
                  label="Registrar clics"
                  description="Los enlaces pasan por un redirector para poder contarlos."
                  checked={campaign.trackClicks}
                  onChange={(event) => update("trackClicks", event.target.checked)}
                />
                <Checkbox
                  label="Incluir enlace de baja"
                  description="Obligatorio en comunicaciones comerciales (RGPD / LSSI). Desactívalo sólo en avisos transaccionales."
                  checked={campaign.includeUnsubscribe}
                  onChange={(event) => update("includeUnsubscribe", event.target.checked)}
                />
              </div>

              {!campaign.includeUnsubscribe ? (
                <Alert tone="warning">
                  Sin enlace de baja, un envío comercial incumple la normativa y es mucho más probable que acabe
                  marcado como spam.
                </Alert>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      {/* Panel lateral de acciones */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Enviar" />
          <div className="space-y-4 p-5">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Destinatarios en cola</dt>
                <dd className="tabular-nums font-medium">{formatNumber(campaign.totalRecipients || reach)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Capacidad ahora (24 h)</dt>
                <dd className="tabular-nums font-medium">{formatNumber(poolRemaining)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Cuentas remitentes</dt>
                <dd className="tabular-nums font-medium">
                  <button
                    type="button"
                    onClick={() => setTab("remitentes")}
                    className="text-brand hover:underline"
                  >
                    {activePool.length}
                  </button>
                </dd>
              </div>
            </dl>

            {notReady.length > 0 ? (
              <Alert tone="warning">
                {notReady.length} cuenta(s) del grupo no pueden enviar ahora mismo. Revísalas en la pestaña
                «remitentes».
              </Alert>
            ) : null}

            {!canSend ? (
              <Alert tone="info">
                Para poder enviar hacen falta un asunto, un contenido y al menos una lista de destinatarios.
              </Alert>
            ) : null}

            <div className="space-y-2 border-t border-line pt-4">
              <label className="label" htmlFor="testEmail">
                Enviar una prueba
              </label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy === "test" || !testEmail}
                  onClick={() => act("test", { email: testEmail })}
                >
                  {busy === "test" ? <Spinner /> : "Probar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 border-t border-line pt-4">
              <label className="label" htmlFor="scheduleAt">
                Programar
              </label>
              <Input
                id="scheduleAt"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
              />
              {isScheduled ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy === "cancelSchedule"}
                  onClick={() => act("cancelSchedule")}
                >
                  Cancelar programación
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={!canSend || !scheduleAt || busy === "schedule"}
                  onClick={() => act("schedule", { scheduledAt: new Date(scheduleAt).toISOString() })}
                >
                  {busy === "schedule" ? <Spinner /> : "Programar envío"}
                </Button>
              )}
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!canSend || busy === "send"}
              onClick={() => {
                if (confirm(`Se enviará a unos ${formatNumber(reach)} contactos. ¿Continuar?`)) act("send");
              }}
            >
              {busy === "send" ? (
                <>
                  <Spinner /> Enviando…
                </>
              ) : (
                <>
                  <IconSend size={16} />
                  Enviar ahora
                </>
              )}
            </Button>
          </div>
        </Card>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={saving} onClick={() => save()}>
            {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
          </Button>
          <Button type="button" variant="danger" onClick={remove} aria-label="Borrar campaña">
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
