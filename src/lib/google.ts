import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { encrypt, tryDecrypt } from "./crypto";
import { absoluteUrl, env } from "./env";

/**
 * Alcances solicitados a Google:
 *  - openid/email/profile: identidad de quien inicia sesión.
 *  - gmail.send: enviar en nombre del usuario. Es el alcance mínimo posible
 *    para esta plataforma; NO permite leer el buzón.
 *  - gmail.settings.basic: leer los alias "enviar como" configurados en Gmail,
 *    para poder mandar desde marketing@ en lugar de la dirección personal.
 */
export const OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.settings.basic",
];

export const OAUTH_REDIRECT_PATH = "/api/auth/callback";

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, absoluteUrl(OAUTH_REDIRECT_PATH));
}

export function buildAuthUrl(state: string): string {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline", // necesario para obtener refresh_token
    prompt: "consent", // fuerza a Google a devolver refresh_token también en re-logins
    include_granted_scopes: true,
    scope: OAUTH_SCOPES,
    state,
  });
}

/** ¿Puede esta dirección entrar en la plataforma? */
export function isEmailAllowed(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  const domains = env.allowedDomains;
  const emails = env.allowedEmails;

  if (emails.includes(normalized)) return true;
  if (domains.length === 0) return true; // sin restricción configurada

  const domain = normalized.split("@")[1] ?? "";
  return domains.includes(domain);
}

/**
 * Devuelve un cliente OAuth listo para llamar a la API de Gmail en nombre del
 * usuario, refrescando el access token si está caducado o a punto de caducar.
 *
 * Lanza si el usuario nunca concedió acceso o si Google revocó el permiso; en
 * ese caso hay que mandarle a volver a iniciar sesión.
 */
export async function getAuthenticatedClient(user: User): Promise<OAuth2Client> {
  const refreshToken = tryDecrypt(user.refreshToken);
  const accessToken = tryDecrypt(user.accessToken);

  if (!refreshToken && !accessToken) {
    throw new GoogleAuthError(
      `La cuenta ${user.email} no tiene acceso a Gmail concedido. Vuelve a iniciar sesión para autorizarlo.`,
    );
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
    expiry_date: user.tokenExpiresAt?.getTime(),
  });

  // Margen de 2 minutos para no enviar con un token que caduca a mitad del lote.
  const expiresSoon = !user.tokenExpiresAt || user.tokenExpiresAt.getTime() - Date.now() < 120_000;

  if (expiresSoon && refreshToken) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await persistCredentials(user.id, credentials);
    } catch (error) {
      throw new GoogleAuthError(
        `Google rechazó el token de ${user.email}. Es probable que se revocara el acceso: hay que volver a iniciar sesión. (${describeError(error)})`,
      );
    }
  }

  return client;
}

type Credentials = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
};

export async function persistCredentials(userId: string, credentials: Credentials): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(credentials.access_token ? { accessToken: encrypt(credentials.access_token) } : {}),
      // Google sólo devuelve refresh_token en la primera autorización: si no
      // viene, hay que conservar el que ya teníamos guardado.
      ...(credentials.refresh_token ? { refreshToken: encrypt(credentials.refresh_token) } : {}),
      ...(credentials.expiry_date ? { tokenExpiresAt: new Date(credentials.expiry_date) } : {}),
      ...(credentials.scope ? { grantedScopes: credentials.scope } : {}),
    },
  });
}

/** Alias "enviar como" verificados en Gmail para este usuario. */
export async function listSendAsAddresses(
  user: User,
): Promise<Array<{ email: string; displayName: string; isDefault: boolean; isPrimary: boolean }>> {
  const auth = await getAuthenticatedClient(user);
  const gmail = google.gmail({ version: "v1", auth });

  const { data } = await gmail.users.settings.sendAs.list({ userId: "me" });

  return (data.sendAs ?? [])
    .filter((entry) => entry.sendAsEmail && entry.verificationStatus !== "pending")
    .map((entry) => ({
      email: entry.sendAsEmail!,
      displayName: entry.displayName ?? "",
      isDefault: Boolean(entry.isDefault),
      isPrimary: Boolean(entry.isPrimary),
    }));
}

/** Error de autenticación con Google que la UI puede distinguir del resto. */
export class GoogleAuthError extends Error {
  readonly code = "GOOGLE_AUTH";
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "error desconocido";
  }
}
