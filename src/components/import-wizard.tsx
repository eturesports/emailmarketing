"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select, Spinner, Table, Td, Th } from "./ui";
import { IconCheck, IconUpload } from "./icons";
import { MAPPABLE_FIELDS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

type PreviewResponse = {
  filename: string;
  headers: string[];
  mapping: Record<string, string>;
  totalRows: number;
  truncated: boolean;
  preview: Array<Record<string, string>>;
  rows: Array<Record<string, string>>;
};

type ImportResponse = {
  imported: number;
  updated: number;
  skipped: number;
  invalid: number;
  totalRows: number;
  errors: Array<{ row: number; email: string; reason: string }>;
};

type Step = "upload" | "map" | "done";

export function ImportWizard({ lists }: { lists: Array<{ id: string; name: string }> }) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [data, setData] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [newListName, setNewListName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [resubscribe, setResubscribe] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const emailColumn = Object.entries(mapping).find(([, target]) => target === "email")?.[0] ?? null;

  async function upload(file: File) {
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/import/preview", { method: "POST", body: form });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "No se ha podido leer el fichero.");
        return;
      }

      setData(payload);
      setMapping(payload.mapping);
      setStep("map");
    } catch {
      setError("No se ha podido subir el fichero. Comprueba tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!data) return;

    setBusy(true);
    setError(null);

    try {
      let listIds = [...selectedLists];

      // Crear la lista sobre la marcha ahorra tener que ir a otra pantalla
      // antes de importar, que es el flujo natural al recibir un CSV nuevo.
      if (newListName.trim()) {
        const listResponse = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newListName.trim() }),
        });
        const listPayload = await listResponse.json();

        if (!listResponse.ok) {
          setError(listPayload.error ?? "No se ha podido crear la lista.");
          return;
        }
        listIds = [...listIds, listPayload.list.id];
      }

      const response = await fetch("/api/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          rows: data.rows,
          mapping,
          listIds,
          updateExisting,
          resubscribe,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "La importación ha fallado.");
        return;
      }

      setResult(payload);
      setStep("done");
    } catch {
      setError("La importación ha fallado. Revisa el fichero e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("upload");
    setData(null);
    setMapping({});
    setResult(null);
    setError(null);
    setSelectedLists([]);
    setNewListName("");
    if (fileInput.current) fileInput.current.value = "";
  }

  // --- Paso 1: subida ---
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <Card
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) upload(file);
          }}
          className={
            dragging
              ? "border-brand bg-[#0b1f27] transition-colors"
              : "border-dashed transition-colors hover:border-brand-soft"
          }
        >
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            {busy ? (
              <>
                <Spinner className="size-7 text-brand" />
                <p className="text-sm text-ink-muted">Analizando el fichero…</p>
              </>
            ) : (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-surface-3">
                  <IconUpload size={24} className="text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Arrastra aquí tu fichero</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Formatos admitidos: CSV, TSV, XLSX y XLS. Hasta 20 MB.
                  </p>
                </div>

                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  id="import-file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
                <label
                  htmlFor="import-file"
                  className="inline-flex h-9.5 cursor-pointer items-center rounded-lg bg-brand px-4 text-sm font-medium text-[#04202a] hover:bg-brand-strong"
                >
                  Seleccionar fichero
                </label>

                <a href="/api/import/sample" className="text-xs text-ink-faint hover:text-brand">
                  Descargar un CSV de ejemplo
                </a>
              </>
            )}
          </div>
        </Card>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Card className="p-5">
          <h3 className="text-sm font-semibold">Cómo preparar el fichero</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>• La primera fila debe contener los nombres de las columnas.</li>
            <li>
              • Hace falta una columna con el correo. Se reconocen automáticamente nombres como{" "}
              <code className="rounded bg-surface-3 px-1 font-mono text-xs">email</code>,{" "}
              <code className="rounded bg-surface-3 px-1 font-mono text-xs">correo</code> o{" "}
              <code className="rounded bg-surface-3 px-1 font-mono text-xs">e-mail</code>.
            </li>
            <li>• Del Excel se lee la primera hoja del libro.</li>
            <li>
              • Cualquier columna extra (equipo, categoría, tier…) se guarda como campo personalizado y podrás usarla
              en tus correos como <code className="rounded bg-surface-3 px-1 font-mono text-xs">{"{{equipo}}"}</code>.
            </li>
          </ul>
        </Card>
      </div>
    );
  }

  // --- Paso 3: resultado ---
  if (step === "done" && result) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#0f3529]">
              <IconCheck size={26} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold">Importación completada</h3>
            <p className="text-sm text-ink-muted">
              Se han procesado {formatNumber(result.totalRows)} filas de «{data?.filename}».
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            <Metric label="Nuevos" value={result.imported} tone="text-success" />
            <Metric label="Actualizados" value={result.updated} tone="text-brand" />
            <Metric label="Omitidos" value={result.skipped} tone="text-ink-muted" />
            <Metric label="Con errores" value={result.invalid} tone="text-danger" />
          </div>
        </Card>

        {result.errors.length > 0 ? (
          <Card>
            <CardHeader
              title="Filas descartadas"
              description={`Se muestran las primeras ${result.errors.length}. El resto del fichero se importó con normalidad.`}
            />
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <thead>
                  <tr>
                    <Th className="w-20">Fila</Th>
                    <Th>Valor</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((entry, index) => (
                    <tr key={index}>
                      <Td className="tabular-nums text-xs text-ink-faint">{entry.row}</Td>
                      <Td className="font-mono text-xs">{entry.email || "—"}</Td>
                      <Td className="text-xs text-ink-muted">{entry.reason}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/contactos"
            className="inline-flex h-9.5 items-center rounded-lg bg-brand px-4 text-sm font-medium text-[#04202a] hover:bg-brand-strong"
          >
            Ver contactos
          </Link>
          <Button variant="secondary" onClick={reset}>
            Importar otro fichero
          </Button>
        </div>
      </div>
    );
  }

  // --- Paso 2: mapeo ---
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={`Asignar columnas · ${data?.filename}`}
          description={`${formatNumber(data?.totalRows ?? 0)} filas detectadas. Revisa a qué campo va cada columna.`}
        />

        {data?.truncated ? (
          <div className="px-5 pt-4">
            <Alert tone="warning">
              El fichero supera el máximo de 50.000 filas por importación: sólo se procesarán las primeras 50.000.
            </Alert>
          </div>
        ) : null}

        <div className="space-y-2 p-5">
          {data?.headers.map((header) => {
            const target = mapping[header] ?? "ignore";
            const isCustom = target.startsWith("custom:");

            return (
              <div key={header} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <div className="min-w-0 rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <p className="truncate text-sm font-medium">{header}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {data.preview[0]?.[header] || <span className="italic">vacío</span>}
                  </p>
                </div>

                <span aria-hidden="true" className="hidden text-ink-faint sm:block">
                  →
                </span>

                <Select
                  value={isCustom ? "custom" : target}
                  aria-label={`Destino de la columna ${header}`}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMapping((current) => ({
                      ...current,
                      [header]: value === "custom" ? `custom:${header}` : value,
                    }));
                  }}
                >
                  {MAPPABLE_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                      {field.required ? " (obligatorio)" : ""}
                    </option>
                  ))}
                  <option value="custom">Campo personalizado «{header}»</option>
                  <option value="ignore">No importar</option>
                </Select>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Vista previa" description="Primeras filas tal y como se leerán." />
        <div className="max-h-64 overflow-auto">
          <Table>
            <thead>
              <tr>
                {data?.headers.map((header) => (
                  <Th key={header}>{header}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.preview.map((row, index) => (
                <tr key={index}>
                  {data.headers.map((header) => (
                    <Td key={header} className="max-w-[220px] truncate text-xs">
                      {row[header] || "—"}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Opciones" />
        <div className="space-y-4 p-5">
          <div>
            <span className="label">Añadir a estas listas</span>
            {lists.length > 0 ? (
              <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
                {lists.map((list) => (
                  <Checkbox
                    key={list.id}
                    label={list.name}
                    checked={selectedLists.includes(list.id)}
                    onChange={() =>
                      setSelectedLists((current) =>
                        current.includes(list.id) ? current.filter((id) => id !== list.id) : [...current, list.id],
                      )
                    }
                  />
                ))}
              </div>
            ) : null}

            <Input
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="…o escribe el nombre de una lista nueva"
            />
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            <Checkbox
              label="Actualizar los contactos que ya existan"
              description="Si está desmarcado, los correos ya registrados se omiten sin tocar sus datos."
              checked={updateExisting}
              onChange={(event) => setUpdateExisting(event.target.checked)}
            />
            <Checkbox
              label="Reactivar contactos dados de baja"
              description="Actívalo sólo si tienes constancia de que han vuelto a dar su consentimiento."
              checked={resubscribe}
              onChange={(event) => setResubscribe(event.target.checked)}
            />
          </div>
        </div>
      </Card>

      {!emailColumn ? (
        <Alert tone="warning">
          Ninguna columna está asignada al campo <strong>Email</strong>. Es obligatorio para poder importar.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={reset} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={runImport} disabled={busy || !emailColumn}>
          {busy ? (
            <>
              <Spinner /> Importando…
            </>
          ) : (
            `Importar ${formatNumber(data?.rows.length ?? 0)} contactos`
          )}
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-surface px-4 py-4 text-center">
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{formatNumber(value)}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
