import crypto from "node:crypto";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Construcción del mensaje MIME y envío a través de la API de Gmail.
 *
 * Enviar por Gmail (en vez de por SMTP propio o un proveedor tipo SendGrid)
 * significa que el correo sale de la infraestructura de Google Workspace: se
 * firma con el DKIM del dominio, queda en "Enviados" del usuario y hereda su
 * reputación de entrega. A cambio se está sujeto a la cuota diaria de la cuenta.
 */

export type EmailAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

export type BuildMessageOptions = {
  from: string;
  fromName?: string | null;
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  listUnsubscribeUrl?: string | null;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
};

/** Codifica una cabecera con caracteres no ASCII según RFC 2047. */
function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Formatea "Nombre <correo@dominio>" con el nombre correctamente escapado. */
export function formatAddress(email: string, name?: string | null): string {
  if (!name || !name.trim()) return email;
  const clean = name.replace(/[\r\n]/g, " ").trim();
  return `${encodeHeaderValue(clean)} <${email}>`;
}

/**
 * Elimina CR/LF de un valor de cabecera. Sin esto, un asunto con un salto de
 * línea permitiría inyectar cabeceras arbitrarias (Bcc, por ejemplo).
 */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function chunk76(base64: string): string {
  return base64.replace(/(.{76})/g, "$1\r\n");
}

/** Genera el mensaje RFC 2822 completo, listo para enviar. */
export function buildMimeMessage(options: BuildMessageOptions): string {
  const boundaryAlt = `alt_${crypto.randomBytes(12).toString("hex")}`;
  const boundaryMixed = `mix_${crypto.randomBytes(12).toString("hex")}`;
  const hasAttachments = Boolean(options.attachments?.length);

  const headers: string[] = [
    `From: ${formatAddress(options.from, options.fromName)}`,
    `To: ${formatAddress(options.to, options.toName)}`,
    `Subject: ${encodeHeaderValue(sanitizeHeader(options.subject))}`,
    "MIME-Version: 1.0",
  ];

  if (options.replyTo) {
    headers.push(`Reply-To: ${sanitizeHeader(options.replyTo)}`);
  }

  if (options.listUnsubscribeUrl) {
    // RFC 8058: con ambas cabeceras, Gmail y Outlook muestran su propio botón
    // "Cancelar suscripción" en la cabecera del mensaje, lo que reduce mucho
    // las marcas de spam frente a obligar a buscar el enlace del pie.
    headers.push(`List-Unsubscribe: <${sanitizeHeader(options.listUnsubscribeUrl)}>`);
    headers.push("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
  }

  for (const [key, value] of Object.entries(options.headers ?? {})) {
    headers.push(`${key}: ${sanitizeHeader(value)}`);
  }

  const alternative = [
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    "",
    `--${boundaryAlt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunk76(Buffer.from(options.text, "utf8").toString("base64")),
    "",
    `--${boundaryAlt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunk76(Buffer.from(options.html, "utf8").toString("base64")),
    "",
    `--${boundaryAlt}--`,
  ].join("\r\n");

  if (!hasAttachments) {
    return [...headers, alternative].join("\r\n");
  }

  const parts: string[] = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
    "",
    `--${boundaryMixed}`,
    alternative,
    "",
  ];

  for (const attachment of options.attachments ?? []) {
    parts.push(
      `--${boundaryMixed}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename.replace(/"/g, "")}"`,
      `Content-Disposition: attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Content-Transfer-Encoding: base64",
      "",
      chunk76(attachment.content.toString("base64")),
      "",
    );
  }

  parts.push(`--${boundaryMixed}--`);
  return parts.join("\r\n");
}

export type SendResult = {
  messageId: string;
  threadId: string;
};

/** Envía un mensaje ya construido a través de la API de Gmail. */
export async function sendMimeMessage(auth: OAuth2Client, mime: string): Promise<SendResult> {
  const gmail = google.gmail({ version: "v1", auth });

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: Buffer.from(mime, "utf8").toString("base64url") },
  });

  return {
    messageId: data.id ?? "",
    threadId: data.threadId ?? "",
  };
}

export async function sendEmail(auth: OAuth2Client, options: BuildMessageOptions): Promise<SendResult> {
  return sendMimeMessage(auth, buildMimeMessage(options));
}

/**
 * Interpreta un error de la API de Gmail y decide si merece la pena reintentar.
 *
 * Un 429 (cuota por minuto) o un 5xx son transitorios; un 400 por dirección
 * inválida no lo es y reintentarlo sólo gasta cuota.
 */
export function classifyGmailError(error: unknown): { retryable: boolean; message: string; status?: number } {
  const anyError = error as { code?: number | string; status?: number; message?: string; errors?: Array<{ message?: string }> };
  const status = typeof anyError?.code === "number" ? anyError.code : anyError?.status;
  const detail = anyError?.errors?.[0]?.message ?? anyError?.message ?? "Error desconocido al enviar";

  if (status === 429 || status === 403) {
    return { retryable: true, message: `Límite de envío de Gmail alcanzado: ${detail}`, status };
  }
  if (typeof status === "number" && status >= 500) {
    return { retryable: true, message: `Gmail no está disponible ahora mismo: ${detail}`, status };
  }
  if (status === 401) {
    return { retryable: false, message: `Autorización de Gmail caducada o revocada: ${detail}`, status };
  }
  if (typeof status === "number") {
    return { retryable: false, message: detail, status };
  }

  // Errores de red sin código HTTP: se reintentan.
  return { retryable: true, message: detail };
}
