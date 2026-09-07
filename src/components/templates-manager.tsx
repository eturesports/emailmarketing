"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, EmptyState, Input } from "./ui";
import { IconPlus, IconTemplate, IconTrash } from "./icons";
import { formatRelative, truncate } from "@/lib/utils";
import { htmlToPlainText } from "@/lib/merge";

export type TemplateSummary = {
  id: string;
  name: string;
  subject: string;
  html: string;
  category: string;
  updatedAt: string;
};

export function TemplatesManager({ templates }: { templates: TemplateSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), html: STARTER_HTML }),
    });

    const payload = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      setError(payload.error ?? "No se ha podido crear la plantilla.");
      return;
    }

    router.push(`/plantillas/${payload.template.id}`);
  }

  async function remove(template: TemplateSummary) {
    if (!confirm(`¿Borrar la plantilla "${template.name}"? Las campañas ya creadas a partir de ella no se tocan.`)) {
      return;
    }

    const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se ha podido borrar la plantilla.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={create} className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la nueva plantilla…"
            className="min-w-[200px] flex-1"
            aria-label="Nombre de la nueva plantilla"
          />
          <Button type="submit" disabled={creating || !name.trim()}>
            <IconPlus size={16} />
            {creating ? "Creando…" : "Crear plantilla"}
          </Button>
        </form>
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconTemplate size={28} />}
            title="Todavía no hay plantillas"
            description="Guarda como plantilla los diseños que reutilizáis: newsletter, nota de prensa, bienvenida a patrocinadores…"
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group flex flex-col transition-colors hover:border-brand-soft">
              {/* Miniatura: el HTML se aísla en un iframe con sandbox para que
                  no ejecute scripts ni herede los estilos del panel. */}
              <div className="relative h-36 overflow-hidden rounded-t-card border-b border-line bg-white">
                <iframe
                  title={`Vista previa de ${template.name}`}
                  sandbox=""
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;}</style></head><body>${template.html}</body></html>`}
                  className="pointer-events-none h-[280px] w-[200%] origin-top-left scale-50 border-0"
                />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/plantillas/${template.id}`} className="min-w-0">
                    <h3 className="truncate text-sm font-semibold group-hover:text-brand">{template.name}</h3>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(template)}
                    aria-label={`Borrar ${template.name}`}
                    className="shrink-0 rounded p-1 text-ink-faint opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>

                <p className="mt-1 line-clamp-2 flex-1 text-xs text-ink-muted">
                  {template.subject || truncate(htmlToPlainText(template.html), 90) || "Sin contenido"}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-ink-faint">
                  <span>{template.category}</span>
                  <span>{formatRelative(template.updatedAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const STARTER_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;">
  <h1 style="font-size:22px;margin:0 0 16px;">Hola {{firstName | equipo}}</h1>
  <p>Escribe aquí el contenido de tu correo.</p>
  <p style="margin:24px 0;">
    <a href="https://eturesports.com" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">Ver más</a>
  </p>
  <p style="color:#6b7280;font-size:13px;">Un saludo,<br />El equipo de Eture Esports</p>
</div>`;
