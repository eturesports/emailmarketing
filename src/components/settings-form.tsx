"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardHeader, Input, Select, Spinner } from "./ui";
import { IconCheck } from "./icons";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export type SettingsUser = {
  id: string;
  email: string;
  fromName: string | null;
  replyTo: string | null;
  dailyQuota: number;
  sendRatePerHour: number;
};

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export function SettingsForm({
  user,
  team,
  isAdmin,
  currentUserId,
}: {
  user: SettingsUser;
  team: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState(user);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

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
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se han podido guardar los ajustes." });
      return;
    }

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
                placeholder="marketing@eture.es"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Déjalo vacío para recibir las respuestas en tu propio buzón.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <CardHeader
            title="Límites de envío"
            description="Ajústalos al tipo de cuenta de Google que utilizas."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dailyQuota">
                Máximo de correos al día
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
                Google Workspace permite hasta 2.000 al día; una cuenta gratuita de Gmail, unos 500. Deja margen para
                tu correo del día a día.
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
