import nodemailer, { type Transporter } from "nodemailer";
import type { User } from "@prisma/client";
import { SMTP_RELAY_HOST, SMTP_RELAY_PORT, TRANSPORT, TRANSPORT_LIMITS, type Transport } from "./constants";
import { getAuthenticatedClient } from "./google";
import { buildMimeMessage, sendMimeMessage, type BuildMessageOptions, type SendResult } from "./gmail";
import { tryDecrypt } from "./crypto";
import { getResendApiKey, getResendDailyLimit } from "./settings";
import { RESEND_RATE_LIMIT_PER_SECOND, sendViaResend } from "./resend";

/**
 * Vías de salida del correo.
 *
 * Ambas mandan a través de la infraestructura de Google Workspace, así que en
 * las dos el mensaje se firma con el DKIM del dominio. La diferencia es el
 * techo por cuenta cada 24 horas:
 *
 *   - GMAIL_API    →  2.000 mensajes. Cero configuración: basta con iniciar
 *                     sesión. Deja copia en la carpeta «Enviados» del usuario.
 *   - SMTP_RELAY   → 10.000 mensajes. Cinco veces más, pero exige que un
 *                     administrador habilite el relay en la consola y que la
 *                     cuenta tenga una contraseña de aplicación. No deja copia
 *                     en «Enviados».
 *
 * Para superar el techo de una sola cuenta se combinan varias en el grupo de
 * remitentes de la campaña (ver lib/sender.ts): el límite es por cuenta, así
 * que N cuentas multiplican por N la capacidad diaria.
 *
 * Y una tercera vía, fuera de Google, para volúmenes que Workspace no cubre:
 *
 *   - RESEND       → sin techo por dirección; el límite lo marca el plan
 *                     contratado. Exige verificar el dominio en Resend
 *                     (SPF + DKIM) y el correo deja de salir de un buzón, pero
 *                     a cambio devuelve rebotes y quejas de spam por webhook,
 *                     que es información que Gmail sencillamente no da.
 */

export type SendContext = {
  /**
   * `idempotencyKey` sólo lo aprovecha Resend; los transportes de Google lo
   * ignoran porque su API no ofrece equivalente.
   */
  send(options: BuildMessageOptions, idempotencyKey?: string): Promise<SendResult>;
  close(): Promise<void>;
  transport: Transport;
};

export class TransportConfigError extends Error {
  readonly code = "TRANSPORT_CONFIG";
  constructor(message: string) {
    super(message);
    this.name = "TransportConfigError";
  }
}

/** Transporte efectivo de una cuenta (con respaldo si el valor no se reconoce). */
export function transportOf(user: Pick<User, "transport">): Transport {
  if (user.transport === TRANSPORT.SMTP_RELAY) return TRANSPORT.SMTP_RELAY;
  if (user.transport === TRANSPORT.RESEND) return TRANSPORT.RESEND;
  return TRANSPORT.GMAIL_API;
}

/** Tope que impone el proveedor a esta cuenta según su transporte. */
export function transportLimit(user: Pick<User, "transport">): number {
  return TRANSPORT_LIMITS[transportOf(user)].messagesPer24h;
}

/**
 * Igual que `transportLimit`, pero con el tope real de Resend leído de los
 * ajustes de la organización (que refleja el plan contratado).
 */
export async function resolvedTransportLimit(user: Pick<User, "transport">): Promise<number> {
  if (transportOf(user) === TRANSPORT.RESEND) return getResendDailyLimit();
  return transportLimit(user);
}

/**
 * ¿Está la cuenta lista para enviar? Devuelve el motivo si no lo está, para
 * poder avisar en la interfaz antes de lanzar una campaña y no a mitad.
 */
export function transportReadiness(user: User): { ready: boolean; reason?: string } {
  const kind = transportOf(user);

  if (kind === TRANSPORT.RESEND) {
    // La clave vive en los ajustes de la organización, no en el usuario, así
    // que aquí sólo se puede comprobar de forma síncrona el resto. El chequeo
    // real se hace en `assertResendReady`, antes de abrir el transporte.
    return { ready: true };
  }

  if (kind === TRANSPORT.SMTP_RELAY) {
    if (!user.smtpUser || !user.smtpPassword) {
      return {
        ready: false,
        reason: `${user.email} usa el relay SMTP pero no tiene credenciales configuradas en Ajustes.`,
      };
    }
    return { ready: true };
  }

  if (!user.refreshToken && !user.accessToken) {
    return { ready: false, reason: `${user.email} no ha autorizado el acceso a Gmail. Tiene que iniciar sesión.` };
  }
  return { ready: true };
}

/**
 * Abre un contexto de envío reutilizable para una cuenta.
 *
 * Se abre una vez por lote y no por correo: en SMTP eso evita renegociar TLS
 * en cada mensaje, y en la API de Gmail evita refrescar el token N veces.
 */
export async function openTransport(user: User): Promise<SendContext> {
  const kind = transportOf(user);

  if (kind === TRANSPORT.RESEND) {
    return openResend(user);
  }
  if (kind === TRANSPORT.SMTP_RELAY) {
    return openSmtpRelay(user);
  }
  return openGmailApi(user);
}

async function openResend(user: User): Promise<SendContext> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    throw new TransportConfigError(
      `${user.email} está configurada para enviar por Resend, pero no hay ninguna clave de API guardada. Añádela en Ajustes.`,
    );
  }

  // Resend limita las peticiones por segundo del equipo entero, no por clave.
  // Se espacian los envíos para no chocar con ese límite y que la cola no se
  // llene de reintentos por 429.
  const minIntervalMs = Math.ceil(1000 / RESEND_RATE_LIMIT_PER_SECOND);
  let lastSentAt = 0;

  return {
    transport: TRANSPORT.RESEND,
    async send(options, idempotencyKey) {
      const wait = minIntervalMs - (Date.now() - lastSentAt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastSentAt = Date.now();

      return sendViaResend(apiKey, options, idempotencyKey);
    },
    async close() {
      // No hay conexión persistente que cerrar: es HTTP.
    },
  };
}

async function openGmailApi(user: User): Promise<SendContext> {
  const auth = await getAuthenticatedClient(user);

  return {
    transport: TRANSPORT.GMAIL_API,
    async send(options) {
      return sendMimeMessage(auth, buildMimeMessage(options));
    },
    async close() {
      // El cliente OAuth no mantiene conexiones abiertas.
    },
  };
}

async function openSmtpRelay(user: User): Promise<SendContext> {
  const username = user.smtpUser?.trim();
  const password = tryDecrypt(user.smtpPassword);

  if (!username || !password) {
    throw new TransportConfigError(
      `${user.email} está configurada para enviar por el relay SMTP, pero faltan las credenciales. Añádelas en Ajustes.`,
    );
  }

  const transporter: Transporter = nodemailer.createTransport({
    host: SMTP_RELAY_HOST,
    port: SMTP_RELAY_PORT,
    secure: false, // STARTTLS en el puerto 587
    requireTLS: true,
    auth: { user: username, pass: password },
    // Una sola conexión reutilizada para todo el lote.
    pool: true,
    maxConnections: 1,
    maxMessages: 200,
  });

  return {
    transport: TRANSPORT.SMTP_RELAY,
    async send(options) {
      // Se reutiliza el mismo constructor MIME que la API de Gmail para que el
      // correo salga idéntico por las dos vías (cabeceras de baja incluidas).
      const raw = buildMimeMessage(options);

      const info = await transporter.sendMail({
        envelope: { from: options.from, to: [options.to] },
        raw,
      });

      return {
        messageId: (info.messageId ?? "").replace(/^<|>$/g, ""),
        threadId: "",
      };
    },
    async close() {
      transporter.close();
    },
  };
}

/**
 * Comprueba que el relay acepta las credenciales, sin enviar nada.
 * Se usa desde Ajustes para validar antes de guardar.
 */
export async function verifySmtpRelay(username: string, password: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: SMTP_RELAY_HOST,
    port: SMTP_RELAY_PORT,
    secure: false,
    requireTLS: true,
    auth: { user: username, pass: password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });

  try {
    await transporter.verify();
  } finally {
    transporter.close();
  }
}
