import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

/**
 * Sesión basada en una cookie httpOnly con un JWT firmado (HS256).
 *
 * Deliberadamente no guardamos nada sensible en el token: sólo el id de usuario.
 * El resto (rol, tokens de Gmail) se lee de base de datos en cada petición, así
 * que revocar un acceso tiene efecto inmediato sin esperar a que expire el JWT.
 */

const COOKIE_NAME = "eture_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = { userId: string };

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = payload.userId;
    return typeof userId === "string" ? { userId } : null;
  } catch {
    // Token caducado, manipulado o firmado con otro secreto.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Cookie de un solo uso para el parámetro `state` del flujo OAuth (anti-CSRF). */
const OAUTH_STATE_COOKIE = "eture_oauth_state";

export async function setOAuthState(state: string): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutos
  });
}

export async function consumeOAuthState(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(OAUTH_STATE_COOKIE)?.value ?? null;
  if (value) store.delete(OAUTH_STATE_COOKIE);
  return value;
}
