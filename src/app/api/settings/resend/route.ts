import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, requireApiAdmin } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import {
  getResendConfig,
  setResendApiKey,
  setResendDailyLimit,
  setResendWebhookSecret,
} from "@/lib/settings";
import { verifyResendApiKey } from "@/lib/resend";

export const dynamic = "force-dynamic";

const schema = z.object({
  /** Vacío = no cambiarla. `null` explícito = borrarla. */
  apiKey: z.string().max(200).nullable().optional(),
  webhookSecret: z.string().max(200).nullable().optional(),
  dailyLimit: z.number().int().min(1).max(5_000_000).optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireApiAdmin();
    return getResendConfig();
  });
}

/**
 * Configuración de Resend para toda la organización.
 *
 * Sólo administradores: la clave de API permite enviar correo en nombre del
 * dominio, así que no es un ajuste personal.
 */
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    await requireApiAdmin();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos de configuración no son válidos.");

    const { apiKey, webhookSecret, dailyLimit } = parsed.data;
    let verifiedDomains: string[] = [];

    if (apiKey === null) {
      await setResendApiKey(null);
    } else if (typeof apiKey === "string" && apiKey.trim() !== "") {
      const key = apiKey.trim();

      // Se valida contra Resend antes de guardarla, y de paso se recuperan los
      // dominios verificados: si la lista viene vacía, el envío fallaría en la
      // primera campaña porque Resend rechaza remitentes sin verificar.
      let result;
      try {
        result = await verifyResendApiKey(key);
      } catch (error) {
        throw new ApiError(400, error instanceof Error ? error.message : "No se ha podido validar la clave.");
      }

      if (result.domains.length === 0) {
        throw new ApiError(
          400,
          "La clave es válida pero no hay ningún dominio verificado en Resend. Verifica eturesports.com (SPF y DKIM) antes de enviar.",
        );
      }

      await setResendApiKey(key);
      verifiedDomains = result.domains;
    }

    if (webhookSecret === null) {
      await setResendWebhookSecret(null);
    } else if (typeof webhookSecret === "string" && webhookSecret.trim() !== "") {
      await setResendWebhookSecret(webhookSecret.trim());
    }

    if (dailyLimit !== undefined) {
      await setResendDailyLimit(dailyLimit);
    }

    return { ...(await getResendConfig()), verifiedDomains };
  });
}
