import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Cierre de sesión.
 *
 * Sólo por POST, y de forma deliberada: como enlace GET, el prefetch de
 * Next.js (o cualquier acelerador del navegador) lo visitaría al pasar el ratón
 * por encima y cerraría la sesión sin que el usuario haya pulsado nada.
 */
export async function POST() {
  await destroySession();

  // 303 fuerza al navegador a hacer GET del destino tras el POST del formulario.
  return NextResponse.redirect(absoluteUrl("/login"), { status: 303 });
}
