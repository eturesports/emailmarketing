import type { Contact } from "@prisma/client";

/**
 * Motor de etiquetas de combinación (merge tags), al estilo de Mailmeteor.
 *
 *   {{firstName}}                 → valor del campo
 *   {{firstName | Hola}}          → valor, o "Hola" si está vacío
 *   {{equipo}}                    → campo personalizado importado del CSV
 *
 * El nombre de la etiqueta no distingue mayúsculas ni acentos, de forma que
 * una columna "Teléfono" del Excel se puede escribir como {{telefono}}.
 */

const TAG_PATTERN = /\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;

export type MergeContext = Record<string, string>;

/** Normaliza una clave: minúsculas, sin acentos y sin separadores. */
export function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_\-.]/g, "");
}

export function parseCustomFields(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      result[key] = String(value);
    }
    return result;
  } catch {
    return {};
  }
}

/** Construye el diccionario de sustitución para un contacto. */
export function buildMergeContext(contact: Contact, extra: MergeContext = {}): MergeContext {
  const custom = parseCustomFields(contact.customFields);
  const firstName = contact.firstName ?? "";
  const lastName = contact.lastName ?? "";

  const base: MergeContext = {
    email: contact.email,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    company: contact.company ?? "",
    jobTitle: contact.jobTitle ?? "",
    phone: contact.phone ?? "",
    country: contact.country ?? "",
    language: contact.language ?? "",
  };

  const context: MergeContext = {};
  // Los campos personalizados van primero para que un campo fijo homónimo mande.
  for (const [key, value] of Object.entries(custom)) context[normalizeKey(key)] = value;
  for (const [key, value] of Object.entries(base)) context[normalizeKey(key)] = value;
  for (const [key, value] of Object.entries(extra)) context[normalizeKey(key)] = value;

  return context;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sustituye las etiquetas de una plantilla.
 *
 * `escape` debe ser true al renderizar cuerpos HTML: un contacto cuyo nombre
 * sea `<script>` no debe poder inyectar marcado en el correo de otro.
 */
export function renderTemplate(template: string, context: MergeContext, options: { escape?: boolean } = {}): string {
  const escape = options.escape ?? false;

  return template.replace(TAG_PATTERN, (_match, rawKey: string, fallback?: string) => {
    const value = context[normalizeKey(rawKey)] ?? "";
    const resolved = value.trim() !== "" ? value : (fallback ?? "");
    return escape ? escapeHtml(resolved) : resolved;
  });
}

/** Etiquetas usadas en un texto, en orden de aparición y sin repetir. */
export function extractTags(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(TAG_PATTERN)) {
    found.add(match[1].trim());
  }
  return [...found];
}

/**
 * Etiquetas del texto que ningún contacto de la muestra puede resolver.
 * Sirve para avisar antes de enviar: "{{equipo}} no existe en 12 contactos".
 */
export function findUnresolvedTags(template: string, contexts: MergeContext[]): string[] {
  const unresolved = new Set<string>();

  // Se recorren las coincidencias en crudo, no `extractTags`, porque hace falta
  // saber si la etiqueta traía valor por defecto: `{{company | Eture}}` nunca
  // queda vacía y no debe avisar aunque ningún contacto tenga empresa.
  for (const match of template.matchAll(TAG_PATTERN)) {
    const fallback = match[2];
    if (fallback !== undefined && fallback.trim() !== "") continue;

    const tag = match[1].trim();
    const key = normalizeKey(tag);
    const missing = contexts.some((context) => !context[key] || context[key].trim() === "");
    if (missing) unresolved.add(tag);
  }

  return [...unresolved];
}

/** Versión en texto plano de un HTML, para la parte `text/plain` del correo. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
      const label = text.replace(/<[^>]+>/g, "").trim();
      return label && label !== href ? `${label} (${href})` : href;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
