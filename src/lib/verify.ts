import dns from "node:dns/promises";
import { isValidEmail, normalizeEmail } from "./utils";
import { VERIFICATION, type Verification } from "./constants";

export { VERIFICATION, VERIFICATION_LABELS, type Verification } from "./constants";

/**
 * Comprobación de direcciones antes de enviarles nada.
 *
 * Cada correo que rebota es una señal negativa para la reputación del dominio:
 * unas cuantas direcciones muertas en una lista comprada o vieja bastan para
 * que los siguientes envíos empiecen a caer en spam. Limpiar antes es mucho
 * más barato que recuperar la reputación después.
 *
 * Se comprueba lo que se puede saber sin enviar nada:
 *
 *   1. Sintaxis y errores de escritura evidentes (gmial.com).
 *   2. Que el dominio exista y **acepte correo** (registros MX).
 *   3. Dominios desechables (buzones de usar y tirar).
 *   4. Direcciones de rol (info@, ventas@), que no son una persona.
 *
 * Lo que NO se hace es preguntarle al servidor de destino si el buzón existe
 * (la llamada «verificación SMTP»): muchos proveedores responden que sí a todo,
 * y a Google en particular no le gusta que le sondeen así — acabaría penalizando
 * justo lo que queremos proteger. Para eso están los rebotes por webhook, que ya
 * se procesan.
 */

/**
 * Dominios de correo desechable más habituales.
 *
 * La lista completa tiene decenas de miles de entradas y cambia a diario;
 * mantenerla aquí sería una batalla perdida. Estos son los que aparecen de
 * verdad en formularios, y con marcarlos como dudosos basta: no se bloquean,
 * sólo se avisa.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
  "fakeinbox.com",
  "dispostable.com",
  "mailnesia.com",
  "spamgourmet.com",
  "correotemporal.org",
]);

/** Buzones que atiende un equipo, no una persona concreta. */
const ROLE_PREFIXES = new Set([
  "info",
  "admin",
  "administracion",
  "contacto",
  "contact",
  "soporte",
  "support",
  "ventas",
  "sales",
  "hola",
  "hello",
  "noreply",
  "no-reply",
  "postmaster",
  "webmaster",
  "abuse",
  "marketing",
  "prensa",
  "press",
  "facturacion",
  "billing",
  "rrhh",
  "hr",
  "legal",
  "office",
]);

/** Dominios frecuentes, para detectar erratas al teclear. */
const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.es",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "live.com",
  "msn.com",
  "protonmail.com",
  "telefonica.net",
  "eturesports.com",
];

/**
 * Distancia de edición contando el intercambio de dos letras contiguas como
 * **un solo** error (Damerau, alineamiento óptimo).
 *
 * Es lo que hace falta aquí: la errata típica al teclear un dominio no es
 * cambiar una letra sino cruzarlas — «gmial» por «gmail» —, y con la distancia
 * clásica eso cuenta como dos errores y se escaparía.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;

  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      rows[i][j] = Math.min(
        rows[i - 1][j] + 1, // borrado
        rows[i][j - 1] + 1, // inserción
        rows[i - 1][j - 1] + cost, // sustitución
      );

      // Intercambio de dos letras contiguas.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }

  return rows[a.length][b.length];
}

/** Dominio conocido al que se parece este, si hay alguno a un carácter. */
export function suggestDomain(domain: string): string | null {
  if (COMMON_DOMAINS.includes(domain)) return null;

  for (const candidate of COMMON_DOMAINS) {
    if (editDistance(domain, candidate) === 1) return candidate;
  }
  return null;
}

export type VerificationResult = {
  email: string;
  verification: Verification;
  reason: string | null;
  /** Corrección sugerida cuando parece una errata. */
  suggestion: string | null;
};

/**
 * Caché de dominios por proceso.
 *
 * Una lista importada suele concentrarse en pocos dominios, así que resolver
 * los MX una vez por dominio en lugar de una por contacto reduce miles de
 * consultas DNS a unas decenas.
 */
const mxCache = new Map<string, boolean>();

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const cached = mxCache.get(domain);
  if (cached !== undefined) return cached;

  let accepts = false;
  try {
    const records = await dns.resolveMx(domain);
    accepts = records.length > 0 && records.some((record) => record.exchange);
  } catch {
    // Sin MX, algunos dominios aún aceptan correo en su registro A. Es raro,
    // pero descartarlos sin comprobarlo daría falsos negativos.
    try {
      await dns.resolve4(domain);
      accepts = true;
    } catch {
      accepts = false;
    }
  }

  mxCache.set(domain, accepts);
  return accepts;
}

/** Comprueba una dirección. Devuelve siempre un resultado, nunca lanza. */
export async function verifyEmail(rawEmail: string): Promise<VerificationResult> {
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) {
    return { email, verification: VERIFICATION.INVALID, reason: "El formato no es válido", suggestion: null };
  }

  const [local, domain] = email.split("@");

  const suggestion = suggestDomain(domain);
  if (suggestion) {
    return {
      email,
      verification: VERIFICATION.INVALID,
      reason: `Parece una errata: ¿querías decir ${local}@${suggestion}?`,
      suggestion: `${local}@${suggestion}`,
    };
  }

  if (!(await domainAcceptsMail(domain))) {
    return {
      email,
      verification: VERIFICATION.INVALID,
      reason: `El dominio ${domain} no acepta correo`,
      suggestion: null,
    };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      email,
      verification: VERIFICATION.RISKY,
      reason: "Buzón temporal de usar y tirar",
      suggestion: null,
    };
  }

  if (ROLE_PREFIXES.has(local.replace(/[._-].*$/, ""))) {
    return {
      email,
      verification: VERIFICATION.RISKY,
      reason: "Buzón de equipo, no de una persona: más propenso a marcar como spam",
      suggestion: null,
    };
  }

  return { email, verification: VERIFICATION.VALID, reason: null, suggestion: null };
}

/**
 * Comprueba varias direcciones a la vez.
 *
 * Se procesan en tandas para no abrir cientos de consultas DNS de golpe, que es
 * la forma más rápida de que el resolvedor empiece a descartar peticiones.
 */
export async function verifyEmails(
  emails: string[],
  options: { concurrency?: number } = {},
): Promise<VerificationResult[]> {
  const concurrency = options.concurrency ?? 20;
  const results: VerificationResult[] = [];

  for (let index = 0; index < emails.length; index += concurrency) {
    const batch = emails.slice(index, index + concurrency);
    results.push(...(await Promise.all(batch.map(verifyEmail))));
  }

  return results;
}

/** Resumen de un conjunto de resultados, para mostrarlo de un vistazo. */
export function summarize(results: VerificationResult[]): Record<Verification, number> {
  const summary: Record<Verification, number> = { UNKNOWN: 0, VALID: 0, RISKY: 0, INVALID: 0 };
  for (const result of results) summary[result.verification] += 1;
  return summary;
}
