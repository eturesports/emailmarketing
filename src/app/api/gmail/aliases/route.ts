import { requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { listSendAsAddresses } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Alias «enviar como» verificados en la cuenta de Gmail del usuario.
 *
 * Sirve de comprobación de que la autorización sigue viva: si Google ha
 * revocado el acceso, esta llamada devuelve 409 y la interfaz puede pedir al
 * usuario que vuelva a iniciar sesión antes de programar un envío grande.
 */
export async function GET() {
  return handleApi(async () => {
    const user = await requireApiUser();
    const addresses = await listSendAsAddresses(user);
    return { addresses };
  });
}
