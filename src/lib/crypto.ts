import crypto from "node:crypto";
import { env } from "./env";

/**
 * Cifrado simétrico para los tokens OAuth de Gmail guardados en base de datos.
 *
 * Un refresh token permite enviar correo en nombre del usuario de forma
 * indefinida, así que no se almacena en claro: si alguien se lleva una copia
 * del fichero SQLite (o un volcado de Postgres) sin la ENCRYPTION_KEY, los
 * tokens no le sirven de nada.
 *
 * Formato: v1:<iv base64url>:<authTag base64url>:<ciphertext base64url>
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado para GCM
const PREFIX = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = env.encryptionKey;
  // Aceptamos base64 (salida de `openssl rand -base64 32`) o hex de 64 chars.
  let key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");

  if (key.length !== 32) {
    // Cualquier otra cosa se normaliza a 32 bytes con SHA-256 para no obligar
    // a regenerar la clave si alguien puso una frase de paso.
    key = crypto.createHash("sha256").update(raw).digest();
  }

  cachedKey = key;
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Token cifrado con un formato no reconocido.");
  }

  const [, ivPart, tagPart, dataPart] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

/** Descifra sin lanzar: devuelve null si el token está corrupto o la clave cambió. */
export function tryDecrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

/** Hash con sal fija para anonimizar IPs en los eventos de tracking (RGPD). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHmac("sha256", getKey()).update(ip).digest("base64url").slice(0, 22);
}

/** Comparación en tiempo constante, para secretos como CRON_SECRET. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
