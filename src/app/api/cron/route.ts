import { NextResponse, type NextRequest } from "next/server";
import { runQueue } from "@/lib/sender";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Worker de la cola de envío.
 *
 * Pensado para invocarse cada pocos minutos desde Vercel Cron, un cron del
 * sistema (`curl`) o `npm run worker`. Cada pasada activa las campañas
 * programadas que ya tocan y envía un lote de cada campaña en curso.
 *
 * Protegido con CRON_SECRET, ya sea como cabecera `Authorization: Bearer …`
 * (lo que envía Vercel Cron) o como parámetro `?secret=`.
 */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest): Promise<NextResponse> {
  const expected = env.cronSecret;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado en el servidor; el worker está deshabilitado." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";
  const provided = bearer || query;

  if (!provided || !safeEqual(expected, provided)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const started = Date.now();

  try {
    const result = await runQueue();
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      activated: result.activated,
      followUps: result.followUps,
      campaigns: result.processed,
      sent: result.processed.reduce((total, entry) => total + entry.sent, 0),
      failed: result.processed.reduce((total, entry) => total + entry.failed, 0),
    });
  } catch (error) {
    console.error("[cron]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error en el worker." },
      { status: 500 },
    );
  }
}
