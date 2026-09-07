"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardHeader, Input, Select, Spinner } from "./ui";
import { IconCheck } from "./icons";
import { ROLE_LABELS, TRANSPORT, TRANSPORT_LIMITS, type Role, type Transport } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export type SettingsUser = {
  id: string;
  email: string;
  fromName: string | null;
  replyTo: string | null;
  dailyQuota: number;
  sendRatePerHour: number;
  transport: Transport;
  canSend: boolean;
  smtpUser: string | null;
  hasSmtpPassword: boolean;
  usedInWindow: number;
};

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type ResendConfigView = {
  configured: boolean;
  dailyLimit: number;
  hasWebhookSecret: boolean;
};

export function SettingsForm({
  user,
  team,
  isAdmin,
  currentUserId,
  resendConfig,
  appUrl,
}: {
  user: SettingsUser;
  team: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  resendConfig: ResendConfigView;
  appUrl: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState(user);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [resend, setResend] = useState(resendConfig);
  const [resendKey, setResendKey] = useState("");
  const [resendWebhook, setResendWebhook] = useState("");
  const [savingResend, setSavingResend] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [aliases, setAliases] = useState<Array<{ email: string; displayName: string; isDefault: boolean }> | null>(
    null,
  );
  const [checkingAliases, setCheckingAliases] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  function update<K extends keyof SettingsUser>(key: K, value: SettingsUser[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromName: form.fromName || null,
        replyTo: form.replyTo || null,
        dailyQuota: form.dailyQuota,
        sendRatePerHour: form.sendRatePerHour,
        transport: form.transport,
        canSend: form.canSend,
        smtpUser: form.smtpUser || null,
        // Vacío significa «no la cambies», para no obligar a reescribirla.
        ...(smtpPassword.trim() ? { smtpPassword: smtpPassword.trim() } : {}),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se han podido guardar los ajustes." });
      return;
    }

    setSmtpPassword("");
    setMessage({ tone: "success", text: "Ajustes guardados." });
    router.refresh();
  }

  async function checkGmail() {
    setCheckingAliases(true);
    setAliasError(null);

    const response = await fetch("/api/gmail/aliases");
    const payload = await response.json().catch(() => ({}));
    setCheckingAliases(false);

    if (!response.ok) {
      setAliasError(payload.error ?? "No se ha podido consultar la cuenta de Gmail.");
      setAliases(null);
      return;
    }
    setAliases(payload.addresses ?? []);
  }

  async function saveResend(event: React.FormEvent) {
    event.preventDefault();
    setSavingResend(true);
    setResendMessage(null);

    const response = await fetch("/api/settings/resend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyLimit: resend.dailyLimit,
        ...(resendKey.trim() ? { apiKey: resendKey.trim() } : {}),
        ...(resendWebhook.trim() ? { webhookSecret: resendWebhook.trim() } : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSavingResend(false);

    if (!response.ok) {
      setResendMessage({ tone: "danger", text: payload.error ?? "No se ha podido guardar la configuración." });
      return;
    }

    setResend({
      configured: payload.configured,
      dailyLimit: payload.dailyLimit,
      hasWebhookSecret: payload.hasWebhookSecret,
    });
    setResendKey("");
    setResendWebhook("");
    setResendMessage({
      tone: "success",
      text: payload.verifiedDomains?.length
        ? `Guardado. Dominios verificados en Resend: ${payload.verifiedDomains.join(", ")}.`
        : "Configuración guardada.",
    });
    router.refresh();
  }

  async function updateMember(id: string, changes: { role?: string; isActive?: boolean }) {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, ...changes }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se ha podido actualizar el usuario." });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save}>
        <Card>
          <CardHeader title="Remitente" description="Valores por defecto de tus campañas nuevas." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="fromName">
                Nombre visible
              </label>
              <Input
                id="fromName"
                value={form.fromName ?? ""}
                onChange={(event) => update("fromName", event.target.value)}
                placeholder="Eture Esports"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Los correos salen de <strong>{user.email}</strong> con este nombre.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="replyTo">
                Responder a
              </label>
              <Input
                id="replyTo"
                type="email"
                value={form.replyTo ?? ""}
                onChange={(event) => update("replyTo", event.target.value)}
                placeholder="marketing@eturesports.com"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Déjalo vacío para recibir las respuestas en tu propio buzón.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <CardHeader
            title="Vía de envío"
            description="Determina cuántos correos puede mandar esta cuenta cada 24 horas."
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(TRANSPORT_LIMITS) as Transport[]).map((value) => {
                const info = TRANSPORT_LIMITS[value];
                const active = form.transport === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("transport", value)}
                    aria-pressed={active}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      active ? "border-brand bg-[#0b1f27]" : "border-line hover:border-brand-soft"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{info.label}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-brand">
                        {formatNumber(info.messagesPer24h)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-faint">{info.hint}</span>
                  </button>
                );
              })}
            </div>

            {form.transport === TRANSPORT.RESEND ? (
              <div className="rounded-lg border border-line bg-surface-2 p-4">
                {resendConfig.configured ? (
                  <p className="text-xs text-ink-muted">
                    Esta cuenta enviará por Resend desde <strong className="text-ink">{user.email}</strong>. La
                    dirección debe pertenecer a un dominio verificado en Resend.
                  </p>
                ) : (
                  <p className="text-xs text-warning">
                    Resend todavía no está configurado.{" "}
                    {isAdmin
                      ? "Añade la clave de API más abajo, en la tarjeta «Resend»."
                      : "Pide a un administrador que lo configure."}
                  </p>
                )}
              </div>
            ) : null}

            {form.transport === TRANSPORT.SMTP_RELAY ? (
              <div className="space-y-3 rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-xs text-ink-muted">
                  El relay quintuplica el límite de esta cuenta, pero antes un administrador tiene que habilitarlo en{" "}
                  <strong className="text-ink">
                    Consola de administración → Aplicaciones → Google Workspace → Gmail → Enrutamiento → Servicio de
                    retransmisión SMTP
                  </strong>
                  , marcando «Solo direcciones de mis dominios» y «Requerir autenticación SMTP».
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="smtpUser">
                      Cuenta que se autentica
                    </label>
                    <Input
                      id="smtpUser"
                      type="email"
                      value={form.smtpUser ?? ""}
                      onChange={(event) => update("smtpUser", event.target.value)}
                      placeholder={user.email}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="smtpPassword">
                      Contraseña de aplicación
                    </label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      autoComplete="new-password"
                      value={smtpPassword}
                      onChange={(event) => setSmtpPassword(event.target.value)}
                      placeholder={form.hasSmtpPassword ? "•••••••• (guardada)" : "16 caracteres"}
                    />
                    <p className="mt-1 text-xs text-ink-faint">
                      Se genera en{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        Cuenta de Google → Contraseñas de aplicaciones
                      </a>
                      . Se comprueba contra el relay antes de guardarla y se almacena cifrada.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-4 text-sm">
              <input
                type="checkbox"
                checked={form.canSend}
                onChange={(event) => update("canSend", event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-line bg-surface-2 accent-[#22d3ee]"
              />
              <span>
                <span className="text-ink">Prestar esta cuenta al grupo de remitentes</span>
                <span className="block text-xs text-ink-faint">
                  Permite que otras campañas repartan envíos por esta cuenta para superar el techo de una sola.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <Card className="mt-4">
          <CardHeader
            title="Límites propios"
            description="Por debajo del techo de Google, para dejar margen a tu correo del día a día."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dailyQuota">
                Máximo de correos cada 24 h
              </label>
              <Input
                id="dailyQuota"
                type="number"
                min={1}
                max={10000}
                value={form.dailyQuota}
                onChange={(event) => update("dailyQuota", Number(event.target.value))}
              />
              <p className="mt-1 text-xs text-ink-faint">
                Techo de Google con «{TRANSPORT_LIMITS[form.transport].label}»:{" "}
                <strong className="text-ink-muted">
                  {formatNumber(TRANSPORT_LIMITS[form.transport].messagesPer24h)}
                </strong>{" "}
                cada 24 h. Llevas {formatNumber(user.usedInWindow)} en la ventana actual.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="sendRate">
                Ritmo por defecto
              </label>
              <Select
                id="sendRate"
                value={String(form.sendRatePerHour)}
                onChange={(event) => update("sendRatePerHour", Number(event.target.value))}
              >
                <option value="60">60 correos/hora</option>
                <option value="150">150 correos/hora</option>
                <option value="300">300 correos/hora</option>
                <option value="600">600 correos/hora</option>
                <option value="1200">1.200 correos/hora</option>
                <option value="2500">2.500 correos/hora</option>
                <option value="5000">5.000 correos/hora</option>
              </Select>
              <p className="mt-1 text-xs text-ink-faint">
                Cada campaña puede usar un ritmo distinto.
              </p>
            </div>
          </div>
        </Card>

        {message ? (
          <div className="mt-4">
            <Alert tone={message.tone}>{message.text}</Alert>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar ajustes"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader
          title="Conexión con Gmail"
          description="Comprueba que el permiso para enviar sigue activo."
          action={
            <Button type="button" size="sm" variant="secondary" onClick={checkGmail} disabled={checkingAliases}>
              {checkingAliases ? <Spinner /> : "Comprobar ahora"}
            </Button>
          }
        />
        <div className="p-5">
          {aliasError ? (
            <Alert tone="danger" title="Hay un problema con la autorización">
              {aliasError}{" "}
              <a href="/api/auth/login" className="font-medium">
                Volver a autorizar
              </a>
            </Alert>
          ) : aliases === null ? (
            <p className="text-sm text-ink-muted">
              Pulsa «Comprobar ahora» para verificar la conexión y ver desde qué direcciones puedes enviar.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-success">
                <IconCheck size={16} />
                Conexión correcta.
              </div>
              <ul className="space-y-1.5 pt-1">
                {aliases.map((alias) => (
                  <li key={alias.email} className="flex items-center gap-2 text-sm">
                    <span className="text-ink">{alias.email}</span>
                    {alias.displayName ? (
                      <span className="text-xs text-ink-faint">({alias.displayName})</span>
                    ) : null}
                    {alias.isDefault ? <Badge tone="brand">Por defecto</Badge> : null}
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-xs text-ink-faint">
                Para enviar desde otra dirección, configúrala primero como alias «Enviar como» en los ajustes de Gmail.
              </p>
            </div>
          )}
        </div>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader
            title="Resend"
            description="Salida alternativa a Google para volúmenes que Workspace no cubre. Configuración común a todo el equipo."
            action={
              resend.configured ? (
                <Badge tone="success">
                  <IconCheck size={13} />
                  Conectado
                </Badge>
              ) : (
                <Badge tone="neutral">Sin configurar</Badge>
              )
            }
          />

          <form onSubmit={saveResend} className="space-y-4 p-5">
            <p className="text-xs text-ink-muted">
              Resend no limita por dirección: el techo lo marca el plan contratado. Antes de usarlo hay que verificar{" "}
              <strong className="text-ink">eturesports.com</strong> en Resend (SPF y DKIM); los correos dejan de salir
              de un buzón de Gmail y no quedan en «Enviados».
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="resendKey">
                  Clave de API
                </label>
                <Input
                  id="resendKey"
                  type="password"
                  autoComplete="off"
                  value={resendKey}
                  onChange={(event) => setResendKey(event.target.value)}
                  placeholder={resend.configured ? "•••••••• (guardada)" : "re_..."}
                />
                <p className="mt-1 text-xs text-ink-faint">
                  Se valida contra Resend antes de guardarla y se almacena cifrada.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="resendLimit">
                  Tope diario según tu plan
                </label>
                <Input
                  id="resendLimit"
                  type="number"
                  min={1}
                  value={resend.dailyLimit}
                  onChange={(event) =>
                    setResend((current) => ({ ...current, dailyLimit: Number(event.target.value) }))
                  }
                />
                <p className="mt-1 text-xs text-ink-faint">
                  Sirve para avisar antes de lanzar una campaña que se saldría del plan.
                </p>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <label className="label" htmlFor="resendWebhook">
                Secreto del webhook
              </label>
              <Input
                id="resendWebhook"
                type="password"
                autoComplete="off"
                value={resendWebhook}
                onChange={(event) => setResendWebhook(event.target.value)}
                placeholder={resend.hasWebhookSecret ? "•••••••• (guardado)" : "whsec_..."}
              />
              <p className="mt-1 text-xs text-ink-faint">
                Crea el webhook en Resend apuntando a{" "}
                <code className="rounded bg-surface-3 px-1 font-mono text-[11px] text-brand">
                  {appUrl}/api/webhooks/resend
                </code>{" "}
                con los eventos <strong>bounced</strong> y <strong>complained</strong>. Es lo que permite retirar solos
                a los contactos que rebotan o marcan el correo como spam — algo que Gmail no informa.
              </p>
            </div>

            {resendMessage ? <Alert tone={resendMessage.tone}>{resendMessage.text}</Alert> : null}

            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={savingResend}>
                {savingResend ? "Comprobando…" : "Guardar configuración de Resend"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader title="Equipo" description="Quién puede entrar en la plataforma y con qué permisos." />
          <ul className="divide-y divide-line-soft">
            {team.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.name ?? member.email}
                    {member.id === currentUserId ? (
                      <span className="ml-2 text-xs text-ink-faint">(tú)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{member.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {member.isActive ? null : <Badge tone="danger">Desactivado</Badge>}

                  <Select
                    value={member.role}
                    aria-label={`Rol de ${member.email}`}
                    className="w-auto py-1 text-xs"
                    onChange={(event) => updateMember(member.id, { role: event.target.value })}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  {member.id === currentUserId ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant={member.isActive ? "ghost" : "success"}
                      onClick={() => updateMember(member.id, { isActive: !member.isActive })}
                    >
                      {member.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            Los usuarios aparecen aquí la primera vez que inician sesión con una cuenta de un dominio autorizado
            (variable <code className="font-mono">ALLOWED_DOMAINS</code>).
          </p>
        </Card>
      ) : null}
    </div>
  );
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}
