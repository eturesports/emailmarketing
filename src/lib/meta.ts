import { createHmac } from "node:crypto";
import { env } from "./env";
import { safeEqual } from "./crypto";

/**
 * Cliente mínimo de Meta Lead Ads.
 *
 * Meta no manda los datos del lead en el webhook: manda sólo su identificador
 * (`leadgen_id`), y hay que pedir las respuestas a la Graph API con un token
 * que tenga el permiso `leads_retrieval`. Son dos llamadas con un contrato
 * estable, así que no merece la pena arrastrar el SDK de Meta.
 */

// --- Webhook -----------------------------------------------------------------

/**
 * Comprueba la cabecera `X-Hub-Signature-256` de una notificación.
 *
 * Meta firma el cuerpo **tal cual llega** con HMAC-SHA256 y la clave secreta de
 * la app, así que hay que verificarlo antes de convertirlo a JSON.
 */
export function verifyMetaSignature(appSecret: string, rawBody: string, header: string | null): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(header.slice("sha256=".length), expected);
}

/** Notificación de un lead nuevo, tal y como llega en `entry[].changes[].value`. */
export type MetaLeadgenChange = {
  leadgen_id: string;
  form_id?: string;
  page_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time?: number;
};

export type MetaWebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{ field?: string; value?: MetaLeadgenChange }>;
  }>;
};

/** Extrae los leads de una notificación; ignora cualquier otro cambio de la página. */
export function extractLeadgenChanges(body: MetaWebhookBody): MetaLeadgenChange[] {
  const changes: MetaLeadgenChange[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen" || !change.value?.leadgen_id) continue;
      changes.push({ ...change.value, page_id: change.value.page_id ?? entry.id });
    }
  }
  return changes;
}

// --- Graph API ---------------------------------------------------------------

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Si tiene sentido reintentar más tarde (red, límite de peticiones, 5xx). */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export type MetaLead = {
  id: string;
  created_time?: string;
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  platform?: string;
  is_organic?: boolean;
  field_data?: Array<{ name: string; values?: string[] }>;
};

const LEAD_FIELDS = "id,created_time,form_id,ad_id,ad_name,adset_name,campaign_name,platform,is_organic,field_data";

/** Pide a la Graph API las respuestas de un lead. */
export async function fetchMetaLead(leadgenId: string): Promise<MetaLead> {
  const token = env.metaAccessToken;
  if (!token) {
    throw new MetaApiError("Falta META_ACCESS_TOKEN: sin él no se pueden leer los datos del lead.", 0, false);
  }

  const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/${encodeURIComponent(leadgenId)}`);
  url.searchParams.set("fields", LEAD_FIELDS);
  // appsecret_proof: si la app lo exige, una petición sin él se rechaza; si no
  // lo exige, no estorba. Así un token filtrado no basta por sí solo.
  if (env.metaAppSecret) {
    url.searchParams.set("appsecret_proof", createHmac("sha256", env.metaAppSecret).update(token).digest("hex"));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new MetaApiError(
      `No se ha podido contactar con Meta: ${error instanceof Error ? error.message : String(error)}`,
      0,
      true,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as MetaLead & {
    error?: { message?: string; code?: number };
  };

  if (!response.ok || payload.error) {
    const message = payload.error?.message ?? `Meta respondió ${response.status}`;
    // 190 = token caducado o revocado; 10/200 = falta de permisos. Ninguno se
    // arregla reintentando, pero sí cuando alguien renueve el token, así que se
    // tratan como reintentables para no perder el lead.
    const retryable = response.status >= 500 || response.status === 429 || [4, 17, 32, 190, 10, 200].includes(payload.error?.code ?? -1);
    throw new MetaApiError(`Meta: ${message}`, response.status, retryable);
  }

  return payload;
}

// --- Normalización de respuestas ---------------------------------------------

/** Respuestas del formulario como diccionario plano: { email: "…", full_name: "…" }. */
export function flattenFieldData(fieldData: MetaLead["field_data"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fieldData ?? []) {
    if (!field?.name) continue;
    const value = (field.values ?? []).filter(Boolean).join(", ").trim();
    if (value) result[field.name] = value;
  }
  return result;
}
