import { prisma } from "./db";
import { encrypt, tryDecrypt } from "./crypto";
import { RESEND_DEFAULT_DAILY_LIMIT, SETTING_KEYS } from "./constants";

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
