"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Input, Textarea } from "./ui";
import { IconList, IconPlus, IconTrash } from "./icons";
import { formatNumber } from "@/lib/utils";

const PRESET_COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#f87171", "#818cf8", "#f472b6", "#a3e635", "#fb923c"];

export type ListSummary = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  contactCount: number;
  campaignCount: number;
};

export function ListsManager({ lists }: { lists: ListSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || undefined,
        color,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido crear la lista.");
      return;
    }

    setCreating(false);
    router.refresh();
  }

  async function remove(list: ListSummary) {
    if (!confirm(`¿Borrar la lista "${list.name}"? Los contactos no se borran, sólo dejan de pertenecer a ella.`)) {
      return;
    }

    const response = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido borrar la lista.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating((value) => !value)}>
          <IconPlus size={16} />
          Nueva lista
        </Button>
      </div>

      {creating ? (
        <Card className="animate-in p-5">
          <form onSubmit={create} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="list-name">
                  Nombre
                </label>
                <Input id="list-name" name="name" required autoFocus placeholder="Newsletter mensual" />
              </div>
              <div>
                <span className="label">Color</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      aria-label={`Color ${preset}`}
                      aria-pressed={color === preset}
                      className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: preset,
                        borderColor: color === preset ? "#eef4ff" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="list-description">
                Descripción
              </label>
              <Textarea id="list-description" name="description" rows={2} placeholder="Para qué sirve esta lista…" />
            </div>

            {error ? <Alert tone="danger">{error}</Alert> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando…" : "Crear lista"}
              </Button>
            </div>
          </form>
        </Card>
      ) : error ? (
        <Alert tone="danger">{error}</Alert>
      ) : null}

      {lists.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <IconList size={28} className="text-ink-faint" />
            <h3 className="text-sm font-semibold">Todavía no hay listas</h3>
            <p className="max-w-sm text-sm text-ink-muted">
              Las listas agrupan contactos para poder enviarles campañas: prensa, patrocinadores, jugadores…
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id} className="group relative p-5 transition-colors hover:border-brand-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: list.color }} />
                  <Link href={`/listas/${list.id}`} className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-ink group-hover:text-brand">
                      {list.name}
                    </h3>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => remove(list)}
                  aria-label={`Borrar ${list.name}`}
                  className="shrink-0 rounded p-1 text-ink-faint opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <IconTrash size={15} />
                </button>
              </div>

              {list.description ? (
                <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{list.description}</p>
              ) : null}

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold tabular-nums">{formatNumber(list.contactCount)}</span>
                <span className="text-xs text-ink-faint">contactos</span>
              </div>

              {list.campaignCount > 0 ? (
                <p className="mt-1 text-[11px] text-ink-faint">
                  Usada en {list.campaignCount} campaña(s)
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
