"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardHeader, Input, Select } from "./ui";
import { IconCheck } from "./icons";
import { ROLE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  senderCount: number;
};

export type TrackingConfigView = {
  domain: string | null;
  verifiedAt: string | null;
  baseUrl: string;
  cnameTarget: string;
};

export type ResendConfigView = {
  configured: boolean;
  dailyLimit: number;
  hasWebhookSecret: boolean;
};

/**
 * Ajustes de la instalación.
 *
 * Todo lo relativo a *desde dónde* se envía vive en Remitentes: aquí quedan la
 * conexión con Resend (que es del equipo, no de una persona) y el control de
 * quién entra en la plataforma.
 */
export function SettingsForm({
  team,
  isAdmin,
  currentUserId,
  resendConfig,
  trackingConfig,
  appUrl,
}: {
  team: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  resendConfig: ResendConfigView;
  trackingConfig: TrackingConfigView;
  appUrl: string;
}) {
  const router = useRouter();

  const [tracking, setTracking] = useState(trackingConfig);
  const [trackingDomain, setTrackingDomain] = useState(trackingConfig.domain ?? "");
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [resend, setResend] = useState(resendConfig);
  const [resendKey, setResendKey] = useState("");
  const [resendWebhook, setResendWebhook] = useState("");
  const [savingResend, setSavingResend] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function saveResend(event: React.FormEvent) {
    event.preventDefault();
    setSavingResend(true);
    setMessage(null);

    const response = await fetch("/api/settings/resend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyLimit: resend.dailyLimit,
        // Vacío significa «no la cambies», para no obligar a reescribirla.
        ...(resendKey.trim() ? { apiKey: resendKey.trim() } : {}),
        ...(resendWebhook.trim() ? { webhookSecret: resendWebhook.trim() } : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSavingResend(false);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido guardar la configuración." });
      return;
    }

    setResend({
      configured: payload.configured,
      dailyLimit: payload.dailyLimit,
      hasWebhookSecret: payload.hasWebhookSecret,
    });
    setResendKey("");
    setResendWebhook("");
    setMessage({
      tone: "success",
      text: payload.verifiedDomains?.length
        ? `Guardado. Dominios verificados en Resend: ${payload.verifiedDomains.join(", ")}.`
        : "Configuración guardada.",
    });
    router.refresh();
  }

  async function saveTracking(payload: { domain?: string | null; verify?: boolean }) {
    setCheckingTracking(true);
    setTrackingMessage(null);

    const response = await fetch("/api/settings/tracking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    setCheckingTracking(false);

    if (!response.ok) {
      setTrackingMessage({ tone: "danger", text: data.error ?? "No se ha podido guardar." });
      return;
    }

    setTracking({
      domain: data.domain,
      verifiedAt: data.verifiedAt,
      baseUrl: data.baseUrl,
      cnameTarget: data.cnameTarget,
    });
    setTrackingDomain(data.domain ?? "");

    if (data.verification) {
      setTrackingMessage({ tone: data.verification.ok ? "success" : "danger", text: data.verification.message });
    }
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
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {isAdmin ? (
        <Card>
          <CardHeader
            title="Dominio de seguimiento"
            description="Desde qué dominio salen el píxel, los enlaces y la página de baja de tus campañas."
            action={
              tracking.verifiedAt ? (
                <Badge tone="success">
                  <IconCheck size={13} />
                  Verificado
                </Badge>
              ) : tracking.domain ? (
                <Badge tone="warning">Sin verificar</Badge>
              ) : (
                <Badge tone="neutral">Sin configurar</Badge>
              )
            }
          />

          <div className="space-y-4 p-5">
            <p className="text-xs text-ink-muted">
              Los filtros antispam comparan el dominio de los enlaces con el del remitente. Ahora mismo tus enlaces
              salen de{" "}
              <code className="rounded bg-surface-3 px-1 font-mono text-[11px] text-brand">{tracking.baseUrl}</code>,
              que no concuerda con <strong className="text-ink">eturesports.com</strong>. Con un subdominio propio
              (<code className="rounded bg-surface-3 px-1 font-mono text-[11px]">link.eturesports.com</code>) quedan
              alineados.
            </p>

            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <label className="label" htmlFor="trackingDomain">
                  Subdominio
                </label>
                <Input
                  id="trackingDomain"
                  value={trackingDomain}
                  onChange={(event) => setTrackingDomain(event.target.value)}
                  placeholder="link.eturesports.com"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                disabled={checkingTracking || !trackingDomain.trim()}
                onClick={() => saveTracking({ domain: trackingDomain.trim() })}
              >
                {checkingTracking ? "Comprobando…" : "Guardar y verificar"}
              </Button>

              {tracking.domain ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={checkingTracking}
                  onClick={() => saveTracking({ verify: true })}
                >
                  Volver a comprobar
                </Button>
              ) : null}

              {tracking.domain ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={checkingTracking}
                  onClick={() => {
                    if (confirm("¿Quitar el dominio propio? Los enlaces volverán a salir del dominio de la aplicación.")) {
                      saveTracking({ domain: null });
                    }
                  }}
                >
                  Quitar
                </Button>
              ) : null}
            </div>

            <div className="rounded-lg border border-line bg-surface-2 p-4">
              <p className="text-xs font-medium text-ink-muted">Registro DNS que hay que crear</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="text-ink-faint">
                      <th className="pb-1 text-left font-medium">Tipo</th>
                      <th className="pb-1 text-left font-medium">Nombre</th>
                      <th className="pb-1 text-left font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-ink">
                    <tr>
                      <td className="py-1 pr-4">CNAME</td>
                      <td className="py-1 pr-4">{(trackingDomain || "link.eturesports.com").split(".")[0]}</td>
                      <td className="py-1">{tracking.cnameTarget}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Después, da de alta el subdominio en tu hosting para que emita el certificado HTTPS. La verificación
                comprueba justo eso: que <code className="font-mono">https://{trackingDomain || "tu-subdominio"}</code>{" "}
                responde y es esta aplicación.
              </p>
            </div>

            {trackingMessage ? <Alert tone={trackingMessage.tone}>{trackingMessage.text}</Alert> : null}

            {tracking.domain && !tracking.verifiedAt ? (
              <Alert tone="warning">
                Mientras no se verifique, los enlaces seguirán saliendo del dominio de la aplicación. Es a propósito:
                un CNAME a medias dejaría enlaces rotos dentro de correos ya enviados.
              </Alert>
            ) : null}
          </div>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader
            title="Resend"
            description="Salida alternativa a Google para volúmenes que Workspace no cubre. Es común a todo el equipo."
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
              <strong className="text-ink">eturesports.com</strong> en Resend (SPF y DKIM). Después podrás crear
              remitentes con esa vía en{" "}
              <a href="/remitentes" className="text-brand hover:underline">
                Remitentes
              </a>
              .
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
                  onChange={(event) => setResend((current) => ({ ...current, dailyLimit: Number(event.target.value) }))}
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
                    {member.id === currentUserId ? <span className="ml-2 text-xs text-ink-faint">(tú)</span> : null}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {member.email}
                    {member.senderCount > 0 ? ` · ${formatNumber(member.senderCount)} remitente(s)` : ""}
                  </p>
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
            (variable <code className="font-mono">ALLOWED_DOMAINS</code>). Al entrar se les crea automáticamente un
            remitente con su propia dirección. Desactivar a alguien inhabilita también sus remitentes.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
