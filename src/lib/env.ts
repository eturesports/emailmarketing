/**
 * Acceso centralizado y validado a la configuración de entorno.
 *
 * Las variables se leen de forma perezosa para que `next build` no falle en un
 * entorno de CI sin credenciales: sólo revientan cuando alguien intenta usar de
 * verdad la funcionalidad que las necesita.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa tu fichero .env (tienes una plantilla en .env.example).`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function list(name: string): string[] {
  return optional(name)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  get appUrl(): string {
    return optional("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get googleClientId(): string {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret(): string {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get sessionSecret(): string {
    return required("SESSION_SECRET");
  },
  get encryptionKey(): string {
    return required("ENCRYPTION_KEY");
  },
  get allowedDomains(): string[] {
    return list("ALLOWED_DOMAINS");
  },
  get allowedEmails(): string[] {
    return list("ALLOWED_EMAILS");
  },
  get ownerEmail(): string {
    return optional("OWNER_EMAIL").toLowerCase();
  },
  get timezone(): string {
    return optional("TIMEZONE", "Europe/Madrid");
  },
  get cronSecret(): string {
    return optional("CRON_SECRET");
  },
  get cronBatchSize(): number {
    const parsed = Number.parseInt(optional("CRON_BATCH_SIZE", "40"), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
  },
  /** Clave secreta de la app de Meta: firma las notificaciones del webhook. */
  get metaAppSecret(): string {
    return optional("META_APP_SECRET");
  },
  /** Token que se escribe en Meta al suscribir el webhook (hub.verify_token). */
  get metaVerifyToken(): string {
    return optional("META_VERIFY_TOKEN");
  },
  /** Token de acceso con permiso `leads_retrieval` (usuario del sistema o página). */
  get metaAccessToken(): string {
    return optional("META_ACCESS_TOKEN");
  },
  get metaGraphVersion(): string {
    return optional("META_GRAPH_VERSION", "v23.0");
  },
  /** Clave del endpoint genérico /api/leads (Zapier, Make, n8n…). */
  get leadsApiKey(): string {
    return optional("LEADS_API_KEY");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

/** URL absoluta a partir de una ruta relativa, usando APP_URL. */
export function absoluteUrl(path: string): string {
  return `${env.appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
