import { NextResponse, type NextRequest } from "next/server";
import { TRACKING_HEALTH_MARKER } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Señal de vida del subsistema de seguimiento.
 *
 * Es lo que se consulta al verificar un dominio propio: si al pedir
 * `https://link.eturesports.com/api/track/health` vuelve esta marca, el CNAME
 * apunta de verdad a esta instalación y el certificado es válido. Cualquier
 * otra respuesta significa que los enlaces de las campañas se romperían.
 *
 * Es pública a propósito (no lleva sesión) porque la comprobación se hace desde
 * fuera; no expone nada más que la marca y el host por el que ha entrado.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      marker: TRACKING_HEALTH_MARKER,
      host: request.headers.get("host"),
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
