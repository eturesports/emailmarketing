import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { LEAD_PROVIDER } from "@/lib/constants";
import { extractLeadgenChanges, verifyMetaSignature, type MetaWebhookBody } from "@/lib/meta";
import { processLead, recordLead } from "@/lib/leads";
import { processCampaign } from "@/lib/sender";
import { describeError } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook de Meta Lead Ads.
 *
 * Configúralo en developers.facebook.com → tu app → Webhooks → objeto «Page»,
 * campo `leadgen`, con la URL `{APP_URL}/api/webhooks/meta` y el mismo
 * META_VERIFY_TOKEN que hay en el servidor. Después suscribe cada página (la
 * de padres y la de jugadores) a la app. El paso a paso está en el README.
 */

/** Verificación de la suscripción: Meta pide que le devolvamos `hub.challenge`. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";

  const expected = env.metaVerifyToken;
  if (mode === "subscribe" && expected && token && safeEqual(expected, token)) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Token de verificación no válido." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = env.metaAppSecret;
  if (!appSecret) {
    return NextResponse.json({ error: "META_APP_SECRET no está configurado." }, { status: 503 });
  }

  // La firma se calcula sobre el cuerpo tal cual llegó.
  const rawBody = await request.text();
  if (!verifyMetaSignature(appSecret, rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma no válida." }, { status: 401 });
  }

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  const changes = extractLeadgenChanges(body);
  const campaignsToKick = new Set<string>();
  let recorded = 0;

  for (const change of changes) {
    try {
      // Primero se guarda: a partir de aquí el lead no se pierde aunque todo lo
      // demás falle, porque el worker lo reintentará.
      const { lead, created } = await recordLead({
        provider: LEAD_PROVIDER.META,
        externalId: change.leadgen_id,
        formId: change.form_id ?? null,
        pageId: change.page_id ?? null,
        adId: change.ad_id ?? null,
      });
      if (!created) continue;
      recorded += 1;

      const result = await processLead(lead.id);
      if (result.enrolledCampaignId) campaignsToKick.add(result.enrolledCampaignId);
    } catch (error) {
      console.error("[webhook/meta]", change.leadgen_id, describeError(error));
    }
  }

  // La bienvenida sale ya, sin esperar al cron: los primeros minutos después de
  // rellenar un formulario son cuando más probable es que lo lean. Cada mensaje
  // se reclama antes de enviarse, así que no choca con una pasada del worker.
  for (const campaignId of campaignsToKick) {
    try {
      await processCampaign(campaignId, 10);
    } catch (error) {
      console.error("[webhook/meta] envío inmediato", campaignId, describeError(error));
    }
  }

  // Siempre 200 si la firma es buena: lo que haya fallado lo reintenta el
  // worker. Un error aquí haría que Meta reintentase y, tras muchos fallos,
  // desactivase la suscripción.
  return NextResponse.json({ ok: true, received: changes.length, recorded });
}
