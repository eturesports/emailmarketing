import { prisma } from "./db";
import { encrypt, tryDecrypt } from "./crypto";
import { RESEND_DEFAULT_DAILY_LIMIT, SETTING_KEYS } from "./constants";
import { env } from "./env";

/**
 * Configuración a nivel de organización (tabla `Setting`).
 *
 * A diferencia de los ajustes de usuario, esto es común a toda la instalación:
 * la clave de API de Resend, por ejemplo, es una sola para todo el equipo
 * porque en Resend el dominio se verifica una vez y el plan es del equipo, no
 * de cada persona.
 *
 * Los valores sensibles se guardan cifrados con la misma clave que los tokens
 * de Gmail (ver lib/crypto.ts) y nunca se devuelven en claro al cliente.
 */

async function readRaw(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function write(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function remove(key: string): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}

// --- Resend ------------------------------------------------------------------

export async function getResendApiKey(): Promise<string | null> {
  const stored = await readRaw(SETTING_KEYS.RESEND_API_KEY);
  return tryDecrypt(stored);
}

export async function setResendApiKey(apiKey: string | null): Promise<void> {
  if (!apiKey) return remove(SETTING_KEYS.RESEND_API_KEY);
  await write(SETTING_KEYS.RESEND_API_KEY, encrypt(apiKey));
}

export async function hasResendApiKey(): Promise<boolean> {
  return (await readRaw(SETTING_KEYS.RESEND_API_KEY)) !== null;
}

/**
 * Tope diario que la instalación se autoimpone con Resend.
 *
 * Resend no limita por dirección de envío; el techo real lo marca el plan
 * contratado. Guardarlo aquí permite que la plataforma avise antes de lanzar
 * una campaña que se saldría del plan, en vez de descubrirlo con un 429.
 */
export async function getResendDailyLimit(): Promise<number> {
  const stored = await readRaw(SETTING_KEYS.RESEND_DAILY_LIMIT);
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : RESEND_DEFAULT_DAILY_LIMIT;
}

export async function setResendDailyLimit(limit: number): Promise<void> {
  await write(SETTING_KEYS.RESEND_DAILY_LIMIT, String(Math.max(1, Math.floor(limit))));
}

export async function getResendWebhookSecret(): Promise<string | null> {
  return tryDecrypt(await readRaw(SETTING_KEYS.RESEND_WEBHOOK_SECRET));
}

export async function setResendWebhookSecret(secret: string | null): Promise<void> {
  if (!secret) return remove(SETTING_KEYS.RESEND_WEBHOOK_SECRET);
  await write(SETTING_KEYS.RESEND_WEBHOOK_SECRET, encrypt(secret));
}

export type ResendConfig = {
  configured: boolean;
  dailyLimit: number;
  hasWebhookSecret: boolean;
};

/** Estado de la configuración de Resend, sin exponer secretos. */
export async function getResendConfig(): Promise<ResendConfig> {
  const [configured, dailyLimit, webhookSecret] = await Promise.all([
    hasResendApiKey(),
    getResendDailyLimit(),
    readRaw(SETTING_KEYS.RESEND_WEBHOOK_SECRET),
  ]);

  return { configured, dailyLimit, hasWebhookSecret: webhookSecret !== null };
}

// --- Dominio de seguimiento --------------------------------------------------

/**
 * Dominio propio desde el que se sirven el píxel, los enlaces rastreados y la
 * página de baja.
 *
 * Por qué importa: sin él, cada enlace de una campaña apunta al dominio de la
 * aplicación. Los filtros antispam miran si el dominio de los enlaces concuerda
 * con el del remitente, y cuando no concuerdan la puntuación empeora. Con un
 * subdominio del propio dominio de envío (`link.eturesports.com`), enlaces y
 * remitente quedan alineados.
 */
export async function getTrackingDomain(): Promise<string | null> {
  const stored = await readRaw(SETTING_KEYS.TRACKING_DOMAIN);
  return stored?.trim() || null;
}

export async function setTrackingDomain(domain: string | null): Promise<void> {
  if (!domain) {
    await remove(SETTING_KEYS.TRACKING_DOMAIN);
    await remove(SETTING_KEYS.TRACKING_VERIFIED_AT);
    return;
  }
  await write(SETTING_KEYS.TRACKING_DOMAIN, domain.trim().toLowerCase());
}

export async function markTrackingVerified(at = new Date()): Promise<void> {
  await write(SETTING_KEYS.TRACKING_VERIFIED_AT, at.toISOString());
}

export async function getTrackingVerifiedAt(): Promise<Date | null> {
  const stored = await readRaw(SETTING_KEYS.TRACKING_VERIFIED_AT);
  if (!stored) return null;
  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Base de las URL de seguimiento.
 *
 * Sólo se usa el dominio propio si además está **verificado**: un CNAME mal
 * configurado dejaría enlaces rotos en correos ya enviados, que es peor que no
 * tener dominio propio. Mientras no lo esté, se sigue usando APP_URL.
 */
export async function getTrackingBaseUrl(): Promise<string> {
  const [domain, verifiedAt] = await Promise.all([getTrackingDomain(), getTrackingVerifiedAt()]);
  if (!domain || !verifiedAt) return env.appUrl;
  return `https://${domain}`;
}

export type TrackingConfig = {
  domain: string | null;
  verifiedAt: string | null;
  /** La base que se está usando ahora mismo para los enlaces. */
  baseUrl: string;
  /** Host al que debe apuntar el CNAME. */
  cnameTarget: string;
};

export async function getTrackingConfig(): Promise<TrackingConfig> {
  const [domain, verifiedAt, baseUrl] = await Promise.all([
    getTrackingDomain(),
    getTrackingVerifiedAt(),
    getTrackingBaseUrl(),
  ]);

  return {
    domain,
    verifiedAt: verifiedAt?.toISOString() ?? null,
    baseUrl,
    cnameTarget: new URL(env.appUrl).host,
  };
}
