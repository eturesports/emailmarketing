"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select } from "./ui";
import { IconTrash } from "./icons";
import { CONTACT_STATUS_LABELS } from "@/lib/constants";

export type ContactDetail = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  country: string | null;
  notes: string | null;
  status: string;
  customFields: Record<string, string>;
  listIds: string[];
};

export function ContactEditor({
  contact,
  lists,
}: {
  contact: ContactDetail;
  lists: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();

  const [form, setForm] = useState(contact);
  const [customFields, setCustomFields] = useState(() => Object.entries(contact.customFields));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function update<K extends keyof ContactDetail>(key: K, value: ContactDetail[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleList(listId: string) {
    setForm((current) => ({
      ...current,
      listIds: current.listIds.includes(listId)
        ? current.listIds.filter((id) => id !== listId)
        : [...current.listIds, listId],
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      email: form.email,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      company: form.company || null,
      jobTitle: form.jobTitle || null,
      phone: form.phone || null,
      country: form.country || null,
      notes: form.notes || null,
      status: form.status as "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED",
      customFields: Object.fromEntries(customFields.filter(([key]) => key.trim() !== "")),
      listIds: form.listIds,
    };

    const response = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({ tone: "danger", text: data.error ?? "No se ha podido guardar." });
      return;
    }

    setMessage({ tone: "success", text: "Cambios guardados." });
    router.refresh();
  }

  async function remove() {
    if (!confirm(`¿Borrar a ${contact.email}? Se perderá también su historial de envíos.`)) return;

    const response = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (response.ok) router.push("/contactos");
    else setMessage({ tone: "danger", text: "No se ha podido borrar el contacto." });
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="Datos del contacto" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="firstName">
                Nombre
              </label>
              <Input
                id="firstName"
                value={form.firstName ?? ""}
                onChange={(event) => update("firstName", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Apellidos
              </label>
              <Input
                id="lastName"
                value={form.lastName ?? ""}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="company">
                Empresa
              </label>
              <Input
                id="company"
                value={form.company ?? ""}
                onChange={(event) => update("company", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="jobTitle">
                Cargo
              </label>
              <Input
                id="jobTitle"
                value={form.jobTitle ?? ""}
                onChange={(event) => update("jobTitle", event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Teléfono
              </label>
              <Input id="phone" value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="country">
                País
              </label>
              <Input
                id="country"
                value={form.country ?? ""}
                onChange={(event) => update("country", event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">
                Notas internas
              </label>
              <textarea
                id="notes"
                rows={3}
                className="field resize-y"
                value={form.notes ?? ""}
                onChange={(event) => update("notes", event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Campos personalizados"
            description="Disponibles en las campañas como {{nombre_del_campo}}."
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setCustomFields((current) => [...current, ["", ""]])}
              >
                Añadir campo
              </Button>
            }
          />
          <div className="space-y-2 p-5">
            {customFields.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Sin campos personalizados. Los que vienen del CSV aparecen aquí automáticamente.
              </p>
            ) : (
              customFields.map(([key, value], index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={key}
                    placeholder="Nombre del campo"
                    aria-label={`Nombre del campo ${index + 1}`}
                    onChange={(event) =>
                      setCustomFields((current) =>
                        current.map((entry, i) => (i === index ? [event.target.value, entry[1]] : entry)),
                      )
                    }
                  />
                  <Input
                    value={value}
                    placeholder="Valor"
                    aria-label={`Valor del campo ${index + 1}`}
                    onChange={(event) =>
                      setCustomFields((current) =>
                        current.map((entry, i) => (i === index ? [entry[0], event.target.value] : entry)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Quitar campo"
                    onClick={() => setCustomFields((current) => current.filter((_, i) => i !== index))}
                  >
                    <IconTrash size={15} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Estado" />
          <div className="p-5">
            <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
              {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-ink-faint">
              Sólo los contactos suscritos reciben campañas. El resto se omite automáticamente.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Listas" />
          <div className="max-h-64 space-y-2 overflow-y-auto p-5">
            {lists.length === 0 ? (
              <p className="text-sm text-ink-faint">Todavía no has creado ninguna lista.</p>
            ) : (
              lists.map((list) => (
                <Checkbox
                  key={list.id}
                  label={list.name}
                  checked={form.listIds.includes(list.id)}
                  onChange={() => toggleList(list.id)}
                />
              ))
            )}
          </div>
        </Card>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="danger" onClick={remove} aria-label="Borrar contacto">
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
    </form>
  );
}
