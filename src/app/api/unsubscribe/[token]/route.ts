import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/lib/unsubscribe";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * Baja en un clic (RFC 8058). Gmail y Outlook hacen POST a esta URL cuando el
 * usuario pulsa su propio botón «Cancelar suscripción», sin abrir el navegador.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const campaignId = request.nextUrl.searchParams.get("c");

  const result = await unsubscribeByToken(token, campaignId);

  // Se responde 200 incluso con token desconocido: devolver 404 confirmaría a
  // quien sondee la URL qué tokens existen.
  return NextResponse.json({ ok: result.ok }, { status: 200 });
}

/** Algunos clientes siguen el enlace con GET: se les manda a la página de baja. */
export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const campaignId = request.nextUrl.searchParams.get("c");
  const suffix = campaignId ? `?c=${encodeURIComponent(campaignId)}` : "";

  return NextResponse.redirect(absoluteUrl(`/baja/${token}${suffix}`));
}
