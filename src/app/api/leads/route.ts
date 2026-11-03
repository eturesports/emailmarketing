import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { LEAD_PROVIDER } from "@/lib/constants";
import { processLead, recordLead } from "@/lib/leads";
import { processCampaign } from "@/lib/sender";
import { describeError } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Entrada genérica de leads, para lo que no llega por el webhook de Meta:
 * Zapier, Make, n8n, una landing propia o una exportación de Meta Ads.
 *
 *   POST /api/leads
 *   Authorization: Bearer $LEADS_API_KEY
 *   {
 *     "source": "padres",              ← slug del origen (padres | hijos)
 *     "email": "ana@example.com",
 *     "full_name": "Ana García",       ← o first_name / last_name
 *     "phone": "+34600000000",
 *     "lead_id": "123",                ← opcional; evita duplicados si se reenvía
 *     "fields": { "edad_hijo": "16" }  ← opcional; quedan como campos del contacto
 *   }
 */

const schema = z
  .object({
    source: z.string().min(1).max(60),
    email: z.string().max(254).optional(),
    full_name: z.string().max(200).optional(),
    first_name: z.string().max(120).optional(),
    last_name: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    lead_id: z.string().max(120).optional(),
    form_id: z.string().max(60).optional(),
    ad_name: z.string().max(200).optional(),
    campaign_name: z.string().max(200).optional(),
    fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  const expected = env.leadsApiKey;
  if (!expected) {
    return NextResponse.json({ error: "LEADS_API_KEY no está configurada en el servidor." }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : (request.headers.get("x-api-key") ?? "");
  if (!provided || !safeEqual(expected, provided)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos." }, { status: 400 });
  }
  const body = parsed.data;

  const source = await prisma.leadSource.findUnique({ where: { slug: body.source.trim().toLowerCase() } });
  if (!source) {
    return NextResponse.json({ error: `No existe ningún origen «${body.source}».` }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.fields ?? {})) fields[key] = String(value);
  if (body.email) fields.email = body.email;
  if (body.full_name) fields.full_name = body.full_name;
  if (body.first_name) fields.first_name = body.first_name;
  if (body.last_name) fields.last_name = body.last_name;
  if (body.phone) fields.phone_number = body.phone;

  // Sin identificador propio, se deriva del origen y el email: reenviar el
  // mismo lead (un Zap que se reintenta) no lo duplica.
  const externalId =
    body.lead_id?.trim() ||
    `api:${createHash("sha256")
      .update(`${source.id}:${(body.email ?? "").trim().toLowerCase()}`)
      .digest("hex")
      .slice(0, 32)}`;

  try {
    const { lead, created } = await recordLead({
      provider: LEAD_PROVIDER.API,
      externalId,
      formId: body.form_id ?? null,
      adName: body.ad_name ?? null,
      campaignName: body.campaign_name ?? null,
      fields,
      sourceId: source.id,
    });

    if (!created) {
      return NextResponse.json({ ok: true, duplicate: true, leadId: lead.id, status: lead.status });
    }

    const result = await processLead(lead.id);
    if (result.enrolledCampaignId) {
      try {
        await processCampaign(result.enrolledCampaignId, 10);
      } catch (error) {
        console.error("[api/leads] envío inmediato", describeError(error));
      }
    }

    return NextResponse.json({ ok: true, leadId: lead.id, status: result.status, outcome: result.outcome });
  } catch (error) {
    console.error("[api/leads]", describeError(error));
    return NextResponse.json({ error: "No se ha podido registrar el lead." }, { status: 500 });
  }
}
