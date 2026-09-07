import crypto from "node:crypto";
import type { BuildMessageOptions, SendResult } from "./gmail";
import { formatAddress } from "./gmail";

/**
 * Cliente mínimo de la API de Resend.
 *
 * Se habla con la API por HTTP en lugar de usar el SDK oficial: son dos
 * llamadas, el contrato es estable y así no se añade una dependencia más al
 * bundle del servidor.
 *
 * Frente a Gmail, Resend aporta dos cosas que Google no da:
 *   - No hay techo por dirección: el límite lo marca el plan contratado.
 *   - Webhooks de rebote y de queja por spam, que permiten limpiar la base de
 *     contactos de forma automática (con Gmail eso es invisible).
 *
 * A cambio, el correo ya no sale del buzón de nadie: hay que verificar el
 * dominio en Resend (SPF + DKIM) y no queda copia en «Enviados».
 */

const API_BASE = "https://api.resend.com";

/** Límite de peticiones por segundo del plan por defecto de Resend. */
export const RESEND_RATE_LIMIT_PER_SECOND = 10;

export class ResendError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly name_: string = "ResendError",
  ) {
    super(message);
    this.name = "ResendError";
  }
}

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
  headers?: Record<string, string>;
};

function toPayload(options: BuildMessageOptions): ResendPayload {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (options.listUnsubscribeUrl) {
    // Resend no añade estas cabeceras por su cuenta, así que se pasan a mano
    // para que Gmail y Outlook sigan mostrando su botón de baja nativo.
    headers["List-Unsubscribe"] = `<${options.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  return {
    from: formatAddress(options.from, options.fromName),
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    ...(options.replyTo ? { reply_to: options.replyTo } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}

/**
 * Envía un correo por Resend.
 *
 * `idempotencyKey` evita duplicados si la petición se reintenta tras un fallo
 * de red: se usa el identificador del destinatario, que es único por campaña y
 * contacto, así que un reintento nunca manda dos veces el mismo correo.
 */
export async function sendViaResend(
  apiKey: string,
  options: BuildMessageOptions,
  idempotencyKey?: string,
): Promise<SendResult> {
  const response = await fetch(`${API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(toPayload(options)),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new ResendError(response.status, await describeFailure(response));
  }

  const data = (await response.json()) as { id?: string };
  return { messageId: data.id ?? "", threadId: "" };
}

async function describeFailure(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; name?: string; error?: string };
    return body.message ?? body.error ?? body.name ?? `Resend devolvió ${response.status}`;
  } catch {
    return `Resend devolvió ${response.status}`;
  }
}

/** Comprueba que la clave es válida, sin enviar nada. */
export async function verifyResendApiKey(apiKey: string): Promise<{ domains: string[] }> {
  const response = await fetch(`${API_BASE}/domains`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 401 || response.status === 403) {
    throw new ResendError(response.status, "Resend ha rechazado la clave de API.");
  }
  if (!response.ok) {
    throw new ResendError(response.status, await describeFailure(response));
  }

  const data = (await response.json()) as { data?: Array<{ name?: string; status?: string }> };

  return {
    domains: (data.data ?? [])
      .filter((domain) => domain.status === "verified")
      .map((domain) => domain.name ?? "")
      .filter(Boolean),
  };
}

/**
 * Traduce un error de Resend a la misma forma que usa el resto del motor de
 * envío, para que la cola decida igual si reintenta o descarta.
 */
export function classifyResendError(error: unknown): { retryable: boolean; message: string; status?: number } {
  if (error instanceof ResendError) {
    if (error.status === 429) {
      return { retryable: true, message: `Límite de peticiones de Resend alcanzado: ${error.message}`, status: 429 };
    }
    if (error.status === 401 || error.status === 403) {
      return { retryable: false, message: `Resend rechazó la clave de API: ${error.message}`, status: 401 };
    }
    if (error.status >= 500) {
      return { retryable: true, message: `Resend no está disponible: ${error.message}`, status: error.status };
    }
    // 422: dirección inválida, dominio sin verificar… no tiene sentido insistir.
    return { retryable: false, message: error.message, status: error.status };
  }

  const message = error instanceof Error ? error.message : "Error desconocido al enviar por Resend";
  // Tiempos de espera y errores de red sí se reintentan.
  return { retryable: true, message };
}

// --- Webhooks ----------------------------------------------------------------

export type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
    click?: { link?: string };
  };
};

/**
 * Verifica la firma de un webhook de Resend (formato Svix).
 *
 * Sin esta comprobación, cualquiera que conociese la URL podría dar de baja
 * contactos o marcarlos como rebotados enviando peticiones falsas.
 */
export function verifyResendWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Rechaza repeticiones de peticiones antiguas (margen de 5 minutos).
  const sentAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > 300) return false;

  // El secreto viene como `whsec_<base64>`.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");

  // La cabecera puede traer varias firmas separadas por espacio, cada una con
  // el prefijo de su versión: `v1,<firma> v1,<otra>`.
  return signature.split(" ").some((entry) => {
    const value = entry.includes(",") ? entry.split(",")[1] : entry;
    if (!value || value.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  });
}
