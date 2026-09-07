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
  appUrl,
}: {
  team: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  resendConfig: ResendConfigView;
  appUrl: string;
}) {
  const router = useRouter();

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
