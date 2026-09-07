"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, Checkbox, EmptyState, Input, Select, Table, Td, Th } from "./ui";
import { IconSearch, IconTrash, IconUsers } from "./icons";
import {
  CONTACT_STATUS_LABELS,
  VERIFICATION_LABELS,
  type ContactStatus,
  type Verification,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export type ContactRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: string;
  verification: string;
  verificationReason: string | null;
  createdAt: string;
  lists: Array<{ id: string; name: string; color: string }>;
};

export type ListOption = { id: string; name: string };

export function ContactsTable({
  contacts,
  lists,
  filters,
  total,
  page,
  pageSize,
}: {
  contacts: ContactRow[];
  lists: ListOption[];
  filters: { q: string; status: string; listId: string; verification: string };
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(filters.q);
  const [bulkList, setBulkList] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const allSelected = contacts.length > 0 && contacts.every((contact) => selected.has(contact.id));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.listId) params.set("listId", filters.listId);
    if (filters.verification) params.set("verification", filters.verification);
    return params.toString();
  }, [filters]);

  function applyFilters(next: Partial<typeof filters> & { page?: number }) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };

    if (merged.q) params.set("q", merged.q);
    if (merged.status) params.set("status", merged.status);
    if (merged.listId) params.set("listId", merged.listId);
    if (merged.verification) params.set("verification", merged.verification);
    if (next.page && next.page > 1) params.set("page", String(next.page));

    startTransition(() => router.push(`/contactos${params.toString() ? `?${params}` : ""}`));
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(contacts.map((contact) => contact.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function verifySelected() {
    if (selected.size === 0) return;

    setVerifying(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/contacts/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });

    const payload = await response.json().catch(() => ({}));
    setVerifying(false);

    if (!response.ok) {
      setError(payload.error ?? "No se han podido comprobar las direcciones.");
      return;
    }

    setNotice(payload.message);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  async function runBulk(action: string, listId?: string) {
    if (selected.size === 0) return;

    if (action === "delete" && !confirm(`¿Borrar ${selected.size} contacto(s)? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError(null);
    const response = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action, listId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido completar la acción.");
      return;
    }

    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative min-w-[220px] flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters({ q: query, page: 1 });
            }}
          >
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por email, nombre o empresa…"
              className="pl-9"
              aria-label="Buscar contactos"
            />
          </form>

          <Select
            value={filters.status}
            onChange={(event) => applyFilters({ status: event.target.value, page: 1 })}
            aria-label="Filtrar por estado"
            className="w-auto min-w-[140px]"
          >
            <option value="">Todos los estados</option>
            {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Select
            value={filters.listId}
            onChange={(event) => applyFilters({ listId: event.target.value, page: 1 })}
            aria-label="Filtrar por lista"
            className="w-auto min-w-[150px]"
          >
            <option value="">Todas las listas</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.verification}
            onChange={(event) => applyFilters({ verification: event.target.value, page: 1 })}
            aria-label="Filtrar por comprobación"
            className="w-auto min-w-[150px]"
          >
            <option value="">Comprobación</option>
            {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <a
            href={`/api/contacts/export${queryString ? `?${queryString}` : ""}`}
            className="inline-flex h-9.5 items-center rounded-lg border border-line bg-surface-3 px-3 text-xs font-medium text-ink hover:bg-[#22304a]"
          >
            Exportar CSV
          </a>
        </div>
      </Card>

      {selected.size > 0 ? (
        <Card className="flex flex-wrap items-center gap-2 border-brand-soft bg-[#0b1f27] p-3">
          <span className="mr-1 text-sm font-medium">{selected.size} seleccionados</span>

          <Select
            value={bulkList}
            onChange={(event) => setBulkList(event.target.value)}
            aria-label="Lista de destino"
            className="w-auto min-w-[150px]"
          >
            <option value="">Elegir lista…</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>

          <Button size="sm" variant="secondary" disabled={!bulkList} onClick={() => runBulk("addToList", bulkList)}>
            Añadir a la lista
          </Button>
          <Button size="sm" variant="ghost" disabled={!bulkList} onClick={() => runBulk("removeFromList", bulkList)}>
            Quitar de la lista
          </Button>
          <Button size="sm" variant="secondary" disabled={verifying} onClick={verifySelected}>
            {verifying ? "Comprobando…" : "Comprobar direcciones"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => runBulk("unsubscribe")}>
            Dar de baja
          </Button>
          <Button size="sm" variant="ghost" onClick={() => runBulk("resubscribe")}>
            Reactivar
          </Button>
          <Button size="sm" variant="danger" onClick={() => runBulk("delete")}>
            <IconTrash size={14} />
            Borrar
          </Button>

          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Deseleccionar
          </Button>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-[#5b2030] bg-[#2e1119] px-4 py-3 text-sm text-[#fca5a5]">{error}</div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-[#1c5a3d] bg-[#0c2a21] px-4 py-3 text-sm text-[#8ee7c2]">{notice}</div>
      ) : null}

      <Card className={cn(pending && "opacity-60 transition-opacity")}>
        {contacts.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={28} />}
            title="No hay contactos que coincidan"
            description={
              filters.q || filters.status || filters.listId
                ? "Prueba a quitar algún filtro o a buscar otra cosa."
                : "Importa tu base de contactos desde un CSV o un Excel para empezar."
            }
            action={
              !filters.q && !filters.status && !filters.listId ? (
                <Link href="/importar" className="text-sm text-brand hover:underline">
                  Importar contactos →
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todos"
                      className="size-4 cursor-pointer rounded border-line bg-surface-2 accent-brand"
                    />
                  </Th>
                  <Th>Contacto</Th>
                  <Th>Empresa</Th>
                  <Th>Listas</Th>
                  <Th>Estado</Th>
                  <Th>Dirección</Th>
                  <Th>Alta</Th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
                  return (
                    <tr key={contact.id} className="transition-colors hover:bg-surface-2">
                      <Td>
                        <input
                          type="checkbox"
                          checked={selected.has(contact.id)}
                          onChange={() => toggleOne(contact.id)}
                          aria-label={`Seleccionar ${contact.email}`}
                          className="size-4 cursor-pointer rounded border-line bg-surface-2 accent-brand"
                        />
                      </Td>
                      <Td>
                        <Link href={`/contactos/${contact.id}`} className="group block min-w-0">
                          <span className="block truncate text-sm font-medium text-ink group-hover:text-brand">
                            {name || contact.email}
                          </span>
                          {name ? (
                            <span className="block truncate text-xs text-ink-faint">{contact.email}</span>
                          ) : null}
                        </Link>
                      </Td>
                      <Td className="text-sm text-ink-muted">{contact.company ?? "—"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {contact.lists.length === 0 ? (
                            <span className="text-xs text-ink-faint">—</span>
                          ) : (
                            contact.lists.slice(0, 3).map((list) => (
                              <span
                                key={list.id}
                                className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted"
                              >
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: list.color }} />
                                {list.name}
                              </span>
                            ))
                          )}
                          {contact.lists.length > 3 ? (
                            <span className="text-[11px] text-ink-faint">+{contact.lists.length - 3}</span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            contact.status === "SUBSCRIBED"
                              ? "success"
                              : contact.status === "BOUNCED"
                                ? "warning"
                                : contact.status === "COMPLAINED"
                                  ? "danger"
                                  : "neutral"
                          }
                        >
                          {CONTACT_STATUS_LABELS[contact.status as ContactStatus] ?? contact.status}
                        </Badge>
                      </Td>
                      <Td>
                        {contact.verification === "UNKNOWN" ? (
                          <span className="text-xs text-ink-faint">—</span>
                        ) : (
                          <span title={contact.verificationReason ?? undefined}>
                            <Badge
                              tone={
                                contact.verification === "VALID"
                                  ? "success"
                                  : contact.verification === "RISKY"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {VERIFICATION_LABELS[contact.verification as Verification] ?? contact.verification}
                            </Badge>
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-faint">{formatDate(contact.createdAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between px-4 py-3 text-xs text-ink-muted">
                <span>
                  Página {page} de {totalPages} · {total} contactos
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => applyFilters({ page: page - 1 })}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => applyFilters({ page: page + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}

/** Formulario de alta rápida de un contacto. */
export function NewContactForm({ lists }: { lists: ListOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const listIds = form.getAll("listIds").map(String).filter(Boolean);

    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        firstName: String(form.get("firstName") ?? "") || undefined,
        lastName: String(form.get("lastName") ?? "") || undefined,
        company: String(form.get("company") ?? "") || undefined,
        listIds,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido crear el contacto.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="md">
        Añadir contacto
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <Card className="w-full max-w-md animate-in">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">Nuevo contacto</h2>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5">
          <div>
            <label className="label" htmlFor="new-email">
              Email
            </label>
            <Input id="new-email" name="email" type="email" required autoFocus placeholder="nombre@dominio.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="new-firstname">
                Nombre
              </label>
              <Input id="new-firstname" name="firstName" />
            </div>
            <div>
              <label className="label" htmlFor="new-lastname">
                Apellidos
              </label>
              <Input id="new-lastname" name="lastName" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="new-company">
              Empresa
            </label>
            <Input id="new-company" name="company" />
          </div>

          {lists.length > 0 ? (
            <fieldset>
              <legend className="label">Añadir a listas</legend>
              <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-line p-2.5">
                {lists.map((list) => (
                  <Checkbox key={list.id} name="listIds" value={list.id} label={list.name} />
                ))}
              </div>
            </fieldset>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Crear contacto"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
