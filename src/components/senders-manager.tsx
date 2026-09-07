"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardHeader, Input, Select, Spinner } from "./ui";
import { IconCheck, IconPlus, IconTrash } from "./icons";
import { TRANSPORT, TRANSPORT_LIMITS, type Transport } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export type SenderView = {
  id: string;
  label: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  transport: Transport;
  transportLabel: string;
  userEmail: string | null;
  smtpUser: string | null;
  hasSmtpPassword: boolean;
  isActive: boolean;
  dailyQuota: number;
  sendRatePerHour: number;
  quotaKey: string;
  used: number;
  limit: number;
  remaining: number;
  ready: boolean;
  reason: string | null;
};

export type AccountOption = { id: string; email: string; name: string | null; authorized: boolean };

/**
 * Gestión de remitentes.
 *
 * Un remitente es una dirección que envía, no una persona que entra: una cuenta
 * de Google puede tener varios alias y cada uno es un remitente, y un remitente
 * de Resend no necesita cuenta de Google.
 */
export function SendersManager({
  senders,
  accounts,
  resendConfigured,
  totalRemaining,
  totalLimit,
}: {
  senders: SenderView[];
  accounts: AccountOption[];
  resendConfigured: boolean;
  totalRemaining: number;
  totalLimit: number;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  // Estado del formulario de alta
  const [form, setForm] = useState({
    label: "",
    fromEmail: "",
    fromName: "",
    replyTo: "",
    transport: TRANSPORT.GMAIL_API as Transport,
    userId: accounts[0]?.id ?? "",
    smtpUser: "",
    smtpPassword: "",
  });

  /** Remitentes que comparten cuota, para poder avisarlo en la interfaz. */
  const shared = new Map<string, number>();
  for (const sender of senders) shared.set(sender.quotaKey, (shared.get(sender.quotaKey) ?? 0) + 1);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    setMessage(null);

    const response = await fetch("/api/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        fromEmail: form.fromEmail,
        fromName: form.fromName || null,
        replyTo: form.replyTo || null,
        transport: form.transport,
        userId: form.transport === TRANSPORT.RESEND ? null : form.userId || null,
        smtpUser: form.transport === TRANSPORT.SMTP_RELAY ? form.smtpUser : null,
        smtpPassword: form.transport === TRANSPORT.SMTP_RELAY ? form.smtpPassword : null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido crear el remitente." });
      return;
    }

    setCreating(false);
    setForm((current) => ({ ...current, label: "", fromEmail: "", fromName: "", smtpUser: "", smtpPassword: "" }));
    setMessage({ tone: "success", text: `Remitente ${payload.sender.fromEmail} creado.` });
    router.refresh();
  }

  async function update(id: string, changes: Record<string, unknown>) {
    setBusy(id);
    setMessage(null);

    const response = await fetch(`/api/senders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido guardar." });
      return;
    }

    setEditing(null);
    router.refresh();
  }

  async function remove(sender: SenderView) {
    if (!confirm(`¿Quitar el remitente ${sender.fromEmail}?`)) return;

    setBusy(sender.id);
    const response = await fetch(`/api/senders/${sender.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido quitar." });
      return;
    }

    setMessage(
      payload.deactivated
        ? { tone: "info", text: payload.message }
        : { tone: "success", text: "Remitente eliminado." },
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Disponible ahora</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-brand">{formatNumber(totalRemaining)}</p>
          <p className="text-xs text-ink-faint">correos en las próximas 24 h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Techo conjunto</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{formatNumber(totalLimit)}</p>
          <p className="text-xs text-ink-faint">cada 24 h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Remitentes activos</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">
            {senders.filter((sender) => sender.isActive).length}
          </p>
          <p className="text-xs text-ink-faint">de {senders.length} en total</p>
        </Card>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="flex justify-end">
        <Button onClick={() => setCreating((value) => !value)}>
          <IconPlus size={16} />
          Nuevo remitente
        </Button>
      </div>

      {creating ? (
        <Card className="animate-in">
          <CardHeader title="Nuevo remitente" />
          <form onSubmit={create} className="space-y-4 p-5">
            <div>
              <span className="label">Vía de envío</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(TRANSPORT_LIMITS) as Transport[]).map((value) => {
                  const info = TRANSPORT_LIMITS[value];
                  const active = form.transport === value;
                  const blocked = value === TRANSPORT.RESEND && !resendConfigured;

                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={blocked}
                      onClick={() => setForm((current) => ({ ...current, transport: value }))}
                      aria-pressed={active}
                      className={`rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
                        active ? "border-brand bg-[#0b1f27]" : "border-line hover:border-brand-soft"
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{info.label}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-brand">
                          {formatNumber(info.messagesPer24h)}
                        </span>
                      </span>
                      <span className="mt-1 block text-[11px] text-ink-faint">
                        {blocked ? "Configura la clave de Resend en Ajustes." : info.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="new-label">
                  Nombre interno
                </label>
                <Input
                  id="new-label"
                  required
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Prensa"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-email">
                  Dirección de envío
                </label>
                <Input
                  id="new-email"
                  type="email"
                  required
                  value={form.fromEmail}
                  onChange={(event) => setForm((current) => ({ ...current, fromEmail: event.target.value }))}
                  placeholder="prensa@eturesports.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-fromname">
                  Nombre visible
                </label>
                <Input
                  id="new-fromname"
                  value={form.fromName}
                  onChange={(event) => setForm((current) => ({ ...current, fromName: event.target.value }))}
                  placeholder="Eture Esports"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-replyto">
                  Responder a
                </label>
                <Input
                  id="new-replyto"
                  type="email"
                  value={form.replyTo}
                  onChange={(event) => setForm((current) => ({ ...current, replyTo: event.target.value }))}
                />
              </div>
            </div>

            {form.transport !== TRANSPORT.RESEND ? (
              <div>
                <label className="label" htmlFor="new-account">
                  Cuenta de Google que autoriza
                </label>
                <Select
                  id="new-account"
                  value={form.userId}
                  onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={!account.authorized}>
                      {account.email}
                      {account.authorized ? "" : " (sin autorizar Gmail)"}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-ink-faint">
                  La dirección de envío debe ser la de esa cuenta o uno de sus alias «enviar como» verificados en
                  Gmail. Todos los alias de una cuenta comparten su límite diario.
                </p>
              </div>
            ) : (
              <Alert tone="info">
                La dirección debe pertenecer a un dominio verificado en Resend. No hace falta cuenta de Google.
              </Alert>
            )}

            {form.transport === TRANSPORT.SMTP_RELAY ? (
              <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-smtpuser">
                    Cuenta que se autentica
                  </label>
                  <Input
                    id="new-smtpuser"
                    type="email"
                    value={form.smtpUser}
                    onChange={(event) => setForm((current) => ({ ...current, smtpUser: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="new-smtppass">
                    Contraseña de aplicación
                  </label>
                  <Input
                    id="new-smtppass"
                    type="password"
                    autoComplete="new-password"
                    value={form.smtpPassword}
                    onChange={(event) => setForm((current) => ({ ...current, smtpPassword: event.target.value }))}
                  />
                  <p className="mt-1 text-xs text-ink-faint">
                    Se comprueba contra el relay antes de guardar y se almacena cifrada.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy === "create"}>
                {busy === "create" ? <Spinner /> : "Crear remitente"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {senders.length === 0 ? (
          <Card>
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              Todavía no hay remitentes. Al iniciar sesión se crea uno con tu propia dirección.
            </p>
          </Card>
        ) : (
          senders.map((sender) => {
            const percent = sender.limit > 0 ? Math.min(100, (sender.used / sender.limit) * 100) : 0;
            const sharesQuota = (shared.get(sender.quotaKey) ?? 1) > 1;
            const isEditing = editing === sender.id;

            return (
              <Card key={sender.id} className={sender.isActive ? "" : "opacity-60"}>
                <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{sender.label}</h3>
                      <Badge tone={sender.transport === TRANSPORT.RESEND ? "info" : "neutral"}>
                        {sender.transportLabel}
                      </Badge>
                      {sender.ready ? (
                        <Badge tone="success">
                          <IconCheck size={12} />
                          Listo
                        </Badge>
                      ) : (
                        <Badge tone="warning">No puede enviar</Badge>
                      )}
                      {sender.isActive ? null : <Badge tone="neutral">Desactivado</Badge>}
                    </div>

                    <p className="mt-1 truncate text-sm text-ink-muted">{sender.fromEmail}</p>
                    {sender.userEmail && sender.userEmail !== sender.fromEmail ? (
                      <p className="text-xs text-ink-faint">Autorizado por {sender.userEmail}</p>
                    ) : null}
                    {sender.reason ? <p className="mt-1 text-xs text-warning">{sender.reason}</p> : null}

                    <div className="mt-3 max-w-sm">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className={`h-full rounded-full ${percent > 85 ? "bg-warning" : "bg-brand"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-ink-faint">
                        {formatNumber(sender.used)} de {formatNumber(sender.limit)} usados en 24 h ·{" "}
                        <strong className="text-ink-muted">{formatNumber(sender.remaining)} disponibles</strong>
                      </p>
                      {sharesQuota ? (
                        <p className="mt-1 text-[11px] text-ink-faint">
                          Comparte límite con otro remitente de la misma cuenta, así que el hueco se reparte entre
                          ambos.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(isEditing ? null : sender.id)}
                    >
                      {isEditing ? "Cerrar" : "Ajustar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={sender.isActive ? "ghost" : "success"}
                      disabled={busy === sender.id}
                      onClick={() => update(sender.id, { isActive: !sender.isActive })}
                    >
                      {sender.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={busy === sender.id}
                      onClick={() => remove(sender)}
                      aria-label={`Quitar ${sender.fromEmail}`}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <EditPanel sender={sender} busy={busy === sender.id} onSave={(changes) => update(sender.id, changes)} />
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function EditPanel({
  sender,
  busy,
  onSave,
}: {
  sender: SenderView;
  busy: boolean;
  onSave: (changes: Record<string, unknown>) => void;
}) {
  const [label, setLabel] = useState(sender.label);
  const [fromName, setFromName] = useState(sender.fromName ?? "");
  const [replyTo, setReplyTo] = useState(sender.replyTo ?? "");
  const [dailyQuota, setDailyQuota] = useState(sender.dailyQuota);
  const [rate, setRate] = useState(sender.sendRatePerHour);
  const [smtpPassword, setSmtpPassword] = useState("");

  const ceiling = TRANSPORT_LIMITS[sender.transport]?.messagesPer24h ?? sender.limit;

  return (
    <div className="space-y-4 border-t border-line p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`label-${sender.id}`}>
            Nombre interno
          </label>
          <Input id={`label-${sender.id}`} value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`fromname-${sender.id}`}>
            Nombre visible
          </label>
          <Input id={`fromname-${sender.id}`} value={fromName} onChange={(event) => setFromName(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`replyto-${sender.id}`}>
            Responder a
          </label>
          <Input
            id={`replyto-${sender.id}`}
            type="email"
            value={replyTo}
            onChange={(event) => setReplyTo(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`quota-${sender.id}`}>
            Máximo cada 24 h
          </label>
          <Input
            id={`quota-${sender.id}`}
            type="number"
            min={1}
            value={dailyQuota}
            onChange={(event) => setDailyQuota(Number(event.target.value))}
          />
          <p className="mt-1 text-xs text-ink-faint">
            Techo del proveedor: {formatNumber(ceiling)}. Deja margen si la cuenta también se usa para correo diario.
          </p>
        </div>
        <div>
          <label className="label" htmlFor={`rate-${sender.id}`}>
            Ritmo por defecto
          </label>
          <Select id={`rate-${sender.id}`} value={String(rate)} onChange={(event) => setRate(Number(event.target.value))}>
            {[60, 150, 300, 600, 1200, 2500, 5000].map((value) => (
              <option key={value} value={value}>
                {formatNumber(value)} correos/hora
              </option>
            ))}
          </Select>
        </div>

        {sender.transport === TRANSPORT.SMTP_RELAY ? (
          <div>
            <label className="label" htmlFor={`pass-${sender.id}`}>
              Contraseña de aplicación
            </label>
            <Input
              id={`pass-${sender.id}`}
              type="password"
              autoComplete="new-password"
              value={smtpPassword}
              onChange={(event) => setSmtpPassword(event.target.value)}
              placeholder={sender.hasSmtpPassword ? "•••••••• (guardada)" : "16 caracteres"}
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            onSave({
              label,
              fromName: fromName || null,
              replyTo: replyTo || null,
              dailyQuota,
              sendRatePerHour: rate,
              ...(smtpPassword.trim() ? { smtpPassword: smtpPassword.trim() } : {}),
            })
          }
        >
          {busy ? <Spinner /> : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
