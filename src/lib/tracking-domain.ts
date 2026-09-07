import dns from "node:dns/promises";
import net from "node:net";
import { TRACKING_HEALTH_MARKER } from "./constants";

/**
 * Verificación de un dominio de seguimiento propio.
 *
 * Se comprueba lo único que de verdad importa: que al pedir
 * `https://<dominio>/api/track/health` responda **esta** instalación. Mirar sólo
 * el CNAME no bastaría — el DNS puede estar bien y el certificado no, o el
 * proveedor de hosting no tener el dominio dado de alta —, y los enlaces
 * quedarían rotos dentro de correos ya enviados.
 */

export type VerificationResult = {
  ok: boolean;
  /** Mensaje para mostrar tal cual en la interfaz. */
  message: string;
  cname?: string[];
  resolvedIps?: string[];
};

const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidTrackingDomain(domain: string): boolean {
  return HOSTNAME_PATTERN.test(domain);
}

/**
 * Rangos que nunca debe alcanzar una comprobación con dominio elegido por el
 * usuario. Sin esto, alguien con acceso al panel podría usar la verificación
 * para sondear la red interna del servidor.
 */
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // enlace local / metadatos de la nube
    return false;
  }

  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    lower.startsWith("::ffff:127.") ||
    lower.startsWith("::ffff:10.") ||
    lower.startsWith("::ffff:192.168.")
  );
}

export async function verifyTrackingDomain(domain: string, expectedHost: string): Promise<VerificationResult> {
  if (!isValidTrackingDomain(domain)) {
    return { ok: false, message: "El dominio no tiene un formato válido. Escribe algo como link.eturesports.com." };
  }
  if (domain === normalizeDomain(expectedHost)) {
    return { ok: false, message: "Ese es el propio dominio de la aplicación; usa un subdominio distinto." };
  }

  // Diagnóstico: útil para explicar el fallo, pero no es lo que decide.
  let cname: string[] | undefined;
  try {
    cname = await dns.resolveCname(domain);
  } catch {
    cname = undefined;
  }

  let resolvedIps: string[];
  try {
    const records = await dns.lookup(domain, { all: true });
    resolvedIps = records.map((record) => record.address);
  } catch {
    return {
      ok: false,
      message: `El dominio ${domain} no resuelve todavía. Crea el registro CNAME hacia ${expectedHost} y espera unos minutos a que se propague.`,
      cname,
    };
  }

  if (resolvedIps.length === 0 || resolvedIps.some(isPrivateAddress)) {
    return {
      ok: false,
      message: `${domain} apunta a una dirección no pública, así que no se puede usar como dominio de seguimiento.`,
      cname,
      resolvedIps,
    };
  }

  try {
    const response = await fetch(`https://${domain}/api/track/health`, {
      headers: { Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `${domain} responde con un ${response.status}. Comprueba que el dominio esté dado de alta en tu hosting y que tenga certificado HTTPS.`,
        cname,
        resolvedIps,
      };
    }

    const body = (await response.json()) as { marker?: string };
    if (body.marker !== TRACKING_HEALTH_MARKER) {
      return {
        ok: false,
        message: `${domain} responde, pero no es esta aplicación: hay otro servicio delante. Revisa a dónde apunta el CNAME.`,
        cname,
        resolvedIps,
      };
    }

    return { ok: true, message: `${domain} verificado: los enlaces de las campañas ya saldrán desde ahí.`, cname, resolvedIps };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    return {
      ok: false,
      message: `No se ha podido conectar con https://${domain}. Suele ser que el certificado aún no está emitido o que el dominio no está dado de alta en el hosting. (${detail})`,
      cname,
      resolvedIps,
    };
  }
}
