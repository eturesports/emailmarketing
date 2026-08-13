import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { getCapacity } from "@/lib/quota";
import { transportReadiness } from "@/lib/transport";
import { TRANSPORT_LIMITS, type Transport } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Cuentas disponibles como remitentes, con la cuota que le queda a cada una en
 * la ventana móvil de 24 h.
 *
 * Es lo que permite responder en la interfaz a la pregunta importante antes de
 * lanzar un envío grande: «¿cuántos correos puedo mandar ahora mismo?».
 */
export async function GET() {
  return handleApi(async () => {
    await requireApiUser();

    const users = await prisma.user.findMany({
      where: { isActive: true, canSend: true },
      orderBy: { email: "asc" },
    });

    const capacity = await getCapacity(users);

    const senders = capacity.map((entry) => {
      const readiness = transportReadiness(entry.user);
      const transport = entry.user.transport as Transport;

      return {
        id: entry.user.id,
        email: entry.user.email,
        name: entry.user.name,
        transport,
        transportLabel: TRANSPORT_LIMITS[transport]?.label ?? transport,
        used: entry.used,
        limit: entry.limit,
        remaining: readiness.ready ? entry.remaining : 0,
        ready: readiness.ready,
        reason: readiness.reason ?? null,
      };
    });

    return {
      senders,
      totalRemaining: senders.reduce((total, entry) => total + entry.remaining, 0),
      totalLimit: senders.reduce((total, entry) => total + (entry.ready ? entry.limit : 0), 0),
    };
  });
}
