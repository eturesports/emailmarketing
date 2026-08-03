"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button, Card, CardHeader, Input, LinkButton } from "./ui";
import { IconEye, IconSend } from "./icons";
import { MERGE_FIELDS } from "@/lib/constants";

export type EditableTemplate = {
  id: string;
  name: string;
  subject: string;
  html: string;
  previewText: string | null;
  category: string;
};

export function TemplateEditor({ template: initial }: { template: EditableTemplate }) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const [template, setTemplate] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function update<K extends keyof EditableTemplate>(key: K, value: EditableTemplate[K]) {
    setTemplate((current) => ({ ...current, [key]: value }));
  }

  function insertTag(tag: string) {
    const textarea = htmlRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const snippet = `{{${tag}}}`;
    update("html", template.html.slice(0, start) + snippet + template.html.slice(textarea.selectionEnd));

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        subject: template.subject,
        html: template.html,
        previewText: template.previewText || null,
        category: template.category,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se ha podido guardar." });
      return;
    }

    setMessage({ tone: "success", text: "Plantilla guardada." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Contenido"
          action={
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreview((value) => !value)}>
              <IconEye size={15} />
              {preview ? "Editar" : "Previsualizar"}
            </Button>
          }
        />

        <div className="space-y-4 p-5">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="label mb-0 mr-1">Insertar</span>
            {MERGE_FIELDS.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => insertTag(field.key)}
                className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-brand hover:bg-surface-3"
              >
                {field.label}
              </button>
            ))}
          </div>

          {preview ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <iframe
                title="Vista previa de la plantilla"
                sandbox=""
                srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#fff;font-family:Arial,Helvetica,sans-serif;}</style></head><body>${template.html}</body></html>`}
                className="h-[520px] w-full bg-white"
              />
            </div>
          ) : (
            <textarea
              ref={htmlRef}
              value={template.html}
              onChange={(event) => update("html", event.target.value)}
              spellCheck={false}
              aria-label="HTML de la plantilla"
              className="field h-[520px] resize-y font-mono text-xs leading-relaxed"
            />
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Detalles" />
          <div className="space-y-3 p-5">
            <div>
              <label className="label" htmlFor="template-name">
                Nombre
              </label>
              <Input
                id="template-name"
                required
                value={template.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="template-subject">
                Asunto por defecto
              </label>
              <Input
                id="template-subject"
                value={template.subject}
                onChange={(event) => update("subject", event.target.value)}
                placeholder="{{firstName}}, novedades de Eture"
              />
            </div>
            <div>
              <label className="label" htmlFor="template-preview">
                Texto de vista previa
              </label>
              <Input
                id="template-preview"
                value={template.previewText ?? ""}
                onChange={(event) => update("previewText", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="template-category">
                Categoría
              </label>
              <Input
                id="template-category"
                value={template.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="Newsletter"
              />
            </div>
          </div>
        </Card>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar plantilla"}
        </Button>

        <LinkButton
          href={`/campanas/nueva?templateId=${template.id}`}
          variant="secondary"
          className="w-full"
        >
          <IconSend size={15} />
          Crear campaña con esta plantilla
        </LinkButton>
      </div>
    </form>
  );
}
