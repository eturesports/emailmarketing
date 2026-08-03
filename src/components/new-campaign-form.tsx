"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, CardHeader, Input, Spinner } from "./ui";
import { formatNumber } from "@/lib/utils";

type ListOption = { id: string; name: string; color: string; contactCount: number };
type TemplateOption = { id: string; name: string; subject: string; category: string };

export function NewCampaignForm({
  lists,
  templates,
  defaultListId,
  defaultTemplateId,
}: {
  lists: ListOption[];
  templates: TemplateOption[];
  defaultListId?: string;
  defaultTemplateId?: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");
  const [listIds, setListIds] = useState<string[]>(defaultListId ? [defaultListId] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reach = lists
    .filter((list) => listIds.includes(list.id))
    .reduce((total, list) => total + list.contactCount, 0);

  function toggleList(id: string) {
    setListIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subject: subject || undefined,
        templateId: templateId || undefined,
        listIds,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "No se ha podido crear la campaña.");
      return;
    }

    router.push(`/campanas/${payload.campaign.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="Lo básico" />
          <div className="space-y-4 p-5">
            <div>
              <label className="label" htmlFor="campaign-name">
                Nombre interno
              </label>
              <Input
                id="campaign-name"
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Newsletter de marzo"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Sólo lo veis vosotros; no aparece en el correo.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="campaign-subject">
                Asunto
              </label>
              <Input
                id="campaign-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="{{firstName}}, esto es lo que viene en marzo"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Puedes personalizarlo con etiquetas. Lo podrás cambiar después.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Punto de partida" description="Se copia el contenido; la plantilla no se modifica." />
          <div className="grid gap-2 p-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTemplateId("")}
              aria-pressed={templateId === ""}
              className={`rounded-lg border p-4 text-left transition-colors ${
                templateId === ""
                  ? "border-brand bg-[#0b1f27]"
                  : "border-line hover:border-brand-soft"
              }`}
            >
              <p className="text-sm font-medium">Empezar en blanco</p>
              <p className="mt-0.5 text-xs text-ink-faint">Un correo sencillo listo para editar.</p>
            </button>

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                aria-pressed={templateId === template.id}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  templateId === template.id
                    ? "border-brand bg-[#0b1f27]"
                    : "border-line hover:border-brand-soft"
                }`}
              >
                <p className="truncate text-sm font-medium">{template.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {template.subject || template.category}
                </p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Destinatarios" description="Puedes cambiarlo antes de enviar." />
          <div className="max-h-80 space-y-1.5 overflow-y-auto p-5">
            {lists.length === 0 ? (
              <p className="text-sm text-ink-faint">
                No hay listas todavía. Crea una desde «Listas» o importando un CSV.
              </p>
            ) : (
              lists.map((list) => {
                const checked = listIds.includes(list.id);
                return (
                  <label
                    key={list.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
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

          {listIds.length > 0 ? (
            <div className="border-t border-line px-5 py-3 text-xs text-ink-muted">
              Alcance aproximado:{" "}
              <strong className="text-ink">{formatNumber(reach)} contactos</strong>
              <span className="block text-ink-faint">
                Los duplicados entre listas y los dados de baja se descartan al enviar.
              </span>
            </div>
          ) : null}
        </Card>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Button type="submit" disabled={saving || !name.trim()} className="w-full" size="lg">
          {saving ? (
            <>
              <Spinner /> Creando…
            </>
          ) : (
            "Crear y editar contenido"
          )}
        </Button>
      </div>
    </form>
  );
}
