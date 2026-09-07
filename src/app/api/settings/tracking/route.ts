import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, requireApiAdmin } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import {
  getTrackingConfig,
  getTrackingDomain,
  markTrackingVerified,
  setTrackingDomain,
} from "@/lib/settings";
import { isValidTrackingDomain, normalizeDomain, verifyTrackingDomain } from "@/lib/tracking-domain";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
// La verificación hace una consulta DNS y una petición HTTPS al dominio.
export const maxDuration = 30;

const schema = z.object({
  /** `null` explícito borra el dominio y vuelve al de la aplicación. */
  domain: z.string().max(253).nullable().optional(),
  /** Vuelve a comprobar el dominio ya guardado, sin cambiarlo. */
  verify: z.boolean().optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireApiAdmin();
    return getTrackingConfig();
  });
}

/**
 * Configura y verifica el dominio de seguimiento.
 *
 * El dominio sólo pasa a usarse cuando la verificación es correcta: guardar uno
 * mal configurado dejaría enlaces rotos dentro de correos ya enviados, que es
 * peor que no tener dominio propio.
 */
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    await requireApiAdmin();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos no son válidos.");

    const { domain, verify } = parsed.data;
    const expectedHost = new URL(env.appUrl).host;

    if (domain === null) {
      await setTrackingDomain(null);
      return { ...(await getTrackingConfig()), verification: null };
    }

    const target = domain !== undefined ? normalizeDomain(domain) : await getTrackingDomain();
    if (!target) throw new ApiError(400, "Indica el dominio de seguimiento.");

    // El formato se valida antes de guardar: almacenar una cadena que ni
    // siquiera es un nombre de dominio sólo sirve para confundir después.
    if (!isValidTrackingDomain(target)) {
      throw new ApiError(400, "El dominio no tiene un formato válido. Escribe algo como link.eturesports.com.");
    }
    if (target === normalizeDomain(expectedHost)) {
      throw new ApiError(400, "Ese es el propio dominio de la aplicación; usa un subdominio distinto.");
    }

    // Guardar antes de verificar deja constancia de la intención; hasta que la
    // verificación no pase, `getTrackingBaseUrl` sigue devolviendo APP_URL.
    if (domain !== undefined) {
      await setTrackingDomain(target);
    }

    if (domain !== undefined || verify) {
      const result = await verifyTrackingDomain(target, expectedHost);
      if (result.ok) await markTrackingVerified();

      return { ...(await getTrackingConfig()), verification: result };
    }

    return { ...(await getTrackingConfig()), verification: null };
  });
}
