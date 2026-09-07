import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "./db";
import { CONTACT_STATUS, IMPORT_FIELD_ALIASES } from "./constants";
export { MAPPABLE_FIELDS, type MappableField } from "./constants";
import { normalizeKey } from "./merge";
import { isValidEmail, normalizeEmail } from "./utils";
import { VERIFICATION, verifyEmails } from "./verify";

/**
 * Importación de contactos desde CSV, TSV o Excel.
 *
 * El flujo tiene dos pasos, como en Mailmeteor: primero se analiza el fichero y
 * se devuelve una vista previa con el mapeo de columnas que hemos deducido, y
 * después el usuario lo confirma (o lo corrige) y se ejecuta la importación.
 */

export const MAX_IMPORT_ROWS = 50_000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export type ParsedSheet = {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  truncated: boolean;
};

/**
 * Mapeo columna → destino. El destino puede ser un campo fijo, `custom:<nombre>`
 * para guardarlo como campo personalizado, o `ignore` para descartarlo.
 */
export type ColumnMapping = Record<string, string>;

export function isCsvLike(filename: string, mimeType: string): boolean {
  return /\.(csv|tsv|txt)$/i.test(filename) || mimeType.includes("csv") || mimeType.includes("text/plain");
}

export function isExcelLike(filename: string, mimeType: string): boolean {
  return /\.(xlsx|xlsm|xls|ods)$/i.test(filename) || mimeType.includes("spreadsheet") || mimeType.includes("excel");
}

/** Analiza el fichero subido y devuelve cabeceras y filas como texto. */
export function parseSpreadsheet(buffer: Buffer, filename: string, mimeType: string): ParsedSheet {
  if (isExcelLike(filename, mimeType)) return parseExcel(buffer);
  if (isCsvLike(filename, mimeType)) return parseCsv(buffer.toString("utf8"));

  throw new Error("Formato no soportado. Sube un fichero .csv, .tsv, .xlsx o .xls.");
}

function parseCsv(content: string): ParsedSheet {
  // Papaparse deduce el delimitador (coma, punto y coma o tabulador), que es
  // justo lo que hace falta con los CSV que exporta Excel en español.
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const headers = (result.meta.fields ?? []).filter((header) => header && header.trim() !== "");
  const allRows = result.data.map((row) => stringifyRow(row, headers));

  return finalize(headers, allRows);
}

function parseExcel(buffer: Buffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, cellFormula: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El libro de Excel no contiene ninguna hoja.");

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });

  const headerRow = matrix.find((row) => row.some((cell) => String(cell).trim() !== ""));
  if (!headerRow) return { headers: [], rows: [], totalRows: 0, truncated: false };

  const headers = headerRow.map((cell, index) => String(cell).trim() || `Columna ${index + 1}`);
  const startIndex = matrix.indexOf(headerRow) + 1;

  const allRows: Array<Record<string, string>> = [];
  for (const row of matrix.slice(startIndex)) {
    if (!row.some((cell) => String(cell).trim() !== "")) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? "").trim();
    });
    allRows.push(record);
  }

  return finalize(headers, allRows);
}

function stringifyRow(row: Record<string, unknown>, headers: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const header of headers) {
    const value = row[header];
    record[header] = value === null || value === undefined ? "" : String(value).trim();
  }
  return record;
}

function finalize(headers: string[], rows: Array<Record<string, string>>): ParsedSheet {
  const truncated = rows.length > MAX_IMPORT_ROWS;
  return {
    headers,
    rows: truncated ? rows.slice(0, MAX_IMPORT_ROWS) : rows,
    totalRows: rows.length,
    truncated,
  };
}

/**
 * Deduce a qué campo corresponde cada columna a partir de su nombre.
 * Las columnas que no encajan con ningún alias conocido se proponen como campo
 * personalizado, para no perder información del fichero original.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const header of headers) {
    const normalized = normalizeKey(header);
    let matched: string | null = null;

    for (const [field, aliases] of Object.entries(IMPORT_FIELD_ALIASES)) {
      if (used.has(field)) continue;
      if (aliases.some((alias) => normalizeKey(alias) === normalized)) {
        matched = field;
        break;
      }
    }

    if (matched) {
      mapping[header] = matched;
      used.add(matched);
    } else {
      mapping[header] = `custom:${header}`;
    }
  }

  // Sin columna de email no hay importación posible: si ningún alias encajó,
  // probamos con la primera columna que contenga una arroba en su nombre.
  if (!Object.values(mapping).includes("email")) {
    const candidate = headers.find((header) => normalizeKey(header).includes("mail"));
    if (candidate) mapping[candidate] = "email";
  }

  return mapping;
}

export type ImportOptions = {
  rows: Array<Record<string, string>>;
  mapping: ColumnMapping;
  listIds: string[];
  /** Si es true, los contactos existentes se actualizan con los datos nuevos. */
  updateExisting: boolean;
  /** Si es true, un contacto dado de baja vuelve a estado suscrito. */
  resubscribe: boolean;
  /** Si es true, se comprueban las direcciones (dominio, erratas, desechables). */
  verify?: boolean;
  userId: string;
  filename: string;
};

export type ImportResult = {
  jobId: string;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  invalid: number;
  /** Cuántas direcciones quedaron marcadas como no válidas o dudosas. */
  verifiedInvalid: number;
  verifiedRisky: number;
  errors: Array<{ row: number; email: string; reason: string }>;
};

const MAX_REPORTED_ERRORS = 100;

/** Ejecuta la importación: crea o actualiza contactos y los añade a las listas. */
export async function runImport(options: ImportOptions): Promise<ImportResult> {
  const { rows, mapping, listIds, updateExisting, resubscribe, userId, filename, verify = true } = options;

  const emailColumn = Object.keys(mapping).find((column) => mapping[column] === "email");
  if (!emailColumn) {
    throw new Error("Tienes que indicar qué columna contiene el email.");
  }

  // Se comprueban todas las direcciones de una vez antes de tocar la base:
  // así se resuelve cada dominio una sola vez y el resultado ya viene listo
  // para guardarlo junto al contacto.
  const checks = new Map<string, { verification: string; reason: string | null }>();

  if (verify) {
    const candidates = [
      ...new Set(
        rows
          .map((row) => normalizeEmail(row[emailColumn] ?? ""))
          .filter((email) => email && isValidEmail(email)),
      ),
    ];

    for (const result of await verifyEmails(candidates)) {
      checks.set(result.email, { verification: result.verification, reason: result.reason });
    }
  }

  const errors: ImportResult["errors"] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;

  // Deduplicamos dentro del propio fichero: si el CSV trae el mismo correo tres
  // veces, se procesa una sola y las repeticiones cuentan como omitidas.
  const seen = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const rawEmail = row[emailColumn] ?? "";
    const email = normalizeEmail(rawEmail);

    if (!email) {
      invalid += 1;
      pushError(errors, { row: index + 2, email: rawEmail, reason: "Fila sin email" });
      continue;
    }
    if (!isValidEmail(email)) {
      invalid += 1;
      pushError(errors, { row: index + 2, email: rawEmail, reason: "Email con formato no válido" });
      continue;
    }
    if (seen.has(email)) {
      skipped += 1;
      continue;
    }
    seen.add(email);

    const { fields, customFields } = mapRow(row, mapping);
    const check = checks.get(email);
    const verification = check
      ? { verification: check.verification, verificationReason: check.reason, verifiedAt: new Date() }
      : {};

    try {
      const existing = await prisma.contact.findUnique({ where: { email } });

      if (existing) {
        if (!updateExisting) {
          skipped += 1;
          await linkToLists(existing.id, listIds);
          continue;
        }

        const mergedCustom = { ...safeParse(existing.customFields), ...customFields };
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            ...stripEmpty(fields),
            ...verification,
            customFields: JSON.stringify(mergedCustom),
            ...(resubscribe && existing.status === CONTACT_STATUS.UNSUBSCRIBED
              ? { status: CONTACT_STATUS.SUBSCRIBED, unsubscribedAt: null }
              : {}),
          },
        });
        await linkToLists(existing.id, listIds);
        updated += 1;
      } else {
        const created = await prisma.contact.create({
          data: {
            email,
            ...stripEmpty(fields),
            ...verification,
            customFields: JSON.stringify(customFields),
            source: "import",
          },
        });
        await linkToLists(created.id, listIds);
        imported += 1;
      }
    } catch (error) {
      invalid += 1;
      pushError(errors, {
        row: index + 2,
        email,
        reason: error instanceof Error ? error.message : "Error al guardar el contacto",
      });
    }
  }

  let verifiedInvalid = 0;
  let verifiedRisky = 0;
  for (const email of seen) {
    const check = checks.get(email);
    if (check?.verification === VERIFICATION.INVALID) verifiedInvalid += 1;
    if (check?.verification === VERIFICATION.RISKY) verifiedRisky += 1;
  }

  const job = await prisma.importJob.create({
    data: {
      filename,
      userId,
      totalRows: rows.length,
      imported,
      updated,
      skipped,
      invalid,
      status: "DONE",
      errors: JSON.stringify(errors),
      listIds: JSON.stringify(listIds),
    },
  });

  return { jobId: job.id, totalRows: rows.length, imported, updated, skipped, invalid, verifiedInvalid, verifiedRisky, errors };
}

function pushError(errors: ImportResult["errors"], entry: ImportResult["errors"][number]): void {
  if (errors.length < MAX_REPORTED_ERRORS) errors.push(entry);
}

function mapRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
): { fields: Record<string, string>; customFields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const customFields: Record<string, string> = {};

  for (const [column, target] of Object.entries(mapping)) {
    const value = (row[column] ?? "").trim();
    if (!value || target === "ignore" || target === "email") continue;

    if (target.startsWith("custom:")) {
      const name = target.slice("custom:".length).trim();
      if (name) customFields[name] = value;
    } else {
      fields[target] = value;
    }
  }

  return { fields, customFields };
}

/** Quita las claves vacías para no sobrescribir datos buenos con celdas en blanco. */
function stripEmpty(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ""));
}

function safeParse(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function linkToLists(contactId: string, listIds: string[]): Promise<void> {
  if (listIds.length === 0) return;

  // SQLite no soporta `skipDuplicates` en createMany, así que filtramos las
  // pertenencias que ya existen antes de insertar.
  const existing = await prisma.listMembership.findMany({
    where: { contactId, listId: { in: listIds } },
    select: { listId: true },
  });
  const known = new Set(existing.map((entry) => entry.listId));
  const missing = listIds.filter((listId) => !known.has(listId));

  if (missing.length === 0) return;

  await prisma.listMembership.createMany({
    data: missing.map((listId) => ({ listId, contactId })),
  });
}

/** Genera un CSV de ejemplo para descargar desde la pantalla de importación. */
export function buildSampleCsv(): string {
  return [
    "email,nombre,apellidos,empresa,cargo,equipo",
    "ana.garcia@ejemplo.com,Ana,García,Eture Esports,Community Manager,Valorant",
    "luis.perez@ejemplo.com,Luis,Pérez,Club Ejemplo,Coach,League of Legends",
    "marta.ruiz@ejemplo.com,Marta,Ruiz,Patrocinador SL,Marketing,Rocket League",
  ].join("\n");
}

/** Exporta contactos a CSV, incluyendo sus campos personalizados. */
export function contactsToCsv(
  contacts: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    jobTitle: string | null;
    phone: string | null;
    country: string | null;
    status: string;
    customFields: string;
    createdAt: Date;
  }>,
): string {
  const customKeys = new Set<string>();
  for (const contact of contacts) {
    for (const key of Object.keys(safeParse(contact.customFields))) customKeys.add(key);
  }

  const baseHeaders = ["email", "nombre", "apellidos", "empresa", "cargo", "telefono", "pais", "estado", "alta"];
  const headers = [...baseHeaders, ...customKeys];

  const lines = [headers.map(csvCell).join(",")];

  for (const contact of contacts) {
    const custom = safeParse(contact.customFields);
    const row = [
      contact.email,
      contact.firstName ?? "",
      contact.lastName ?? "",
      contact.company ?? "",
      contact.jobTitle ?? "",
      contact.phone ?? "",
      contact.country ?? "",
      contact.status,
      contact.createdAt.toISOString(),
      ...[...customKeys].map((key) => custom[key] ?? ""),
    ];
    lines.push(row.map(csvCell).join(","));
  }

  return lines.join("\n");
}

function csvCell(value: string): string {
  // Prefijo defensivo contra la inyección de fórmulas al abrir el CSV en Excel:
  // una celda que empiece por = + - @ se ejecutaría como fórmula.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}
