/**
 * Constantes de dominio. SQLite no soporta enums nativos, así que los estados
 * viven aquí como uniones de TypeScript y se guardan como texto.
 */

export const CONTACT_STATUS = {
  SUBSCRIBED: "SUBSCRIBED",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  BOUNCED: "BOUNCED",
  COMPLAINED: "COMPLAINED",
} as const;
export type ContactStatus = (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  SUBSCRIBED: "Suscrito",
  UNSUBSCRIBED: "Baja",
  BOUNCED: "Rebotado",
  COMPLAINED: "Spam",
};

export const CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENDING: "SENDING",
  PAUSED: "PAUSED",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  SENDING: "Enviando",
  PAUSED: "Pausada",
  SENT: "Enviada",
  FAILED: "Fallida",
};

export const RECIPIENT_STATUS = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;
export type RecipientStatus = (typeof RECIPIENT_STATUS)[keyof typeof RECIPIENT_STATUS];

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  PENDING: "En cola",
  SENDING: "Enviando",
  SENT: "Enviado",
  FAILED: "Error",
  SKIPPED: "Omitido",
};

export const EVENT_TYPE = {
  SENT: "SENT",
  OPEN: "OPEN",
  CLICK: "CLICK",
  UNSUBSCRIBE: "UNSUBSCRIBE",
  BOUNCE: "BOUNCE",
  FAILED: "FAILED",
} as const;
export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

export const ROLE = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MEMBER: "Miembro",
};

/**
 * Campos fijos del contacto disponibles como etiquetas de combinación.
 * Cualquier otra clave se resuelve contra `customFields`.
 */
export const MERGE_FIELDS = [
  { key: "email", label: "Email" },
  { key: "firstName", label: "Nombre" },
  { key: "lastName", label: "Apellidos" },
  { key: "fullName", label: "Nombre completo" },
  { key: "company", label: "Empresa" },
  { key: "jobTitle", label: "Cargo" },
  { key: "phone", label: "Teléfono" },
  { key: "country", label: "País" },
] as const;

/**
 * Campos fijos del contacto a los que se puede mapear una columna del fichero
 * importado. Vive aquí, y no en lib/import, porque lo usa el asistente de
 * importación en el cliente y lib/import arrastra Prisma y el lector de Excel.
 */
export const MAPPABLE_FIELDS = [
  { key: "email", label: "Email", required: true },
  { key: "firstName", label: "Nombre", required: false },
  { key: "lastName", label: "Apellidos", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "jobTitle", label: "Cargo", required: false },
  { key: "phone", label: "Teléfono", required: false },
  { key: "country", label: "País", required: false },
  { key: "language", label: "Idioma", required: false },
  { key: "notes", label: "Notas", required: false },
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number]["key"];

/** Alias aceptados al mapear columnas de un CSV/Excel a campos del contacto. */
export const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "correo", "correo electronico", "correo electrónico", "mail", "email address"],
  firstName: ["firstname", "first name", "nombre", "name", "nombres"],
  lastName: ["lastname", "last name", "apellido", "apellidos", "surname"],
  company: ["company", "empresa", "organizacion", "organización", "organization", "club", "equipo"],
  jobTitle: ["jobtitle", "job title", "cargo", "puesto", "role", "rol", "position"],
  phone: ["phone", "telefono", "teléfono", "movil", "móvil", "mobile", "tel"],
  country: ["country", "pais", "país"],
  language: ["language", "idioma", "lang", "locale"],
  notes: ["notes", "notas", "comentarios", "observaciones"],
};

// ---------------------------------------------------------------------------
// Transportes de envío
// ---------------------------------------------------------------------------

export const TRANSPORT = {
  GMAIL_API: "GMAIL_API",
  SMTP_RELAY: "SMTP_RELAY",
} as const;
export type Transport = (typeof TRANSPORT)[keyof typeof TRANSPORT];

/**
 * Techos que impone Google a cada cuenta, sobre una **ventana móvil de 24 h**
 * (no sobre el día natural).
 *
 * El relay SMTP de Workspace multiplica por cinco el límite de la API de Gmail
 * para la misma cuenta, a cambio de que un administrador lo habilite en la
 * consola de administración y de usar una contraseña de aplicación.
 *
 * Fuente: «Gmail sending limits in Google Workspace» y «Route outgoing SMTP
 * relay messages through Google» (Ayuda de Google Workspace).
 */
export const TRANSPORT_LIMITS: Record<Transport, { messagesPer24h: number; label: string; hint: string }> = {
  GMAIL_API: {
    messagesPer24h: 2000,
    label: "API de Gmail",
    hint: "2.000 mensajes cada 24 h por cuenta. No requiere configuración adicional.",
  },
  SMTP_RELAY: {
    messagesPer24h: 10000,
    label: "Relay SMTP de Workspace",
    hint: "10.000 mensajes cada 24 h por cuenta. Requiere habilitar el relay en la consola de administración.",
  },
};

/** Cuota diaria de Gmail según el tipo de cuenta (referencia informativa). */
export const GMAIL_DAILY_LIMITS = {
  workspace: 2000,
  workspaceRelay: 10000,
  personal: 500,
} as const;

/** Ventana sobre la que Google contabiliza los límites. */
export const QUOTA_WINDOW_HOURS = 24;

export const SMTP_RELAY_HOST = "smtp-relay.gmail.com";
export const SMTP_RELAY_PORT = 587;
