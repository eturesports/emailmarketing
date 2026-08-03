import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilidades compartidas por servidor y cliente. Este módulo no puede importar
 * nada específico del servidor (Prisma, next/server, credenciales): lo cargan
 * también los componentes de cliente.
 */

/**
 * Zona horaria de la interfaz. En el navegador sólo están disponibles las
 * variables NEXT_PUBLIC_*, así que se contempla ese nombre además del que usa
 * el servidor, con el mismo valor por defecto en ambos lados.
 */
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || "Europe/Madrid";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// --- Formato -----------------------------------------------------------------

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} %`;
}

export function rate(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: TIMEZONE }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIMEZONE,
  }).format(new Date(date));
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const target = new Date(date).getTime();
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(diffSeconds, "second");
}

/** Fecha YYYY-MM-DD en la zona horaria configurada (para el corte de cuota diaria). */
export function currentDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// --- Validación --------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@,;<>()[\]\\]+@[^\s@,;<>()[\]\\.]+(\.[^\s@,;<>()[\]\\.]+)+$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || fallback;
}

/** Convierte una cadena en un slug apto para nombres de fichero. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
