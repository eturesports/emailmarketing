import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { VERIFICATION, verifyEmails } from "@/lib/verify";

export const dynamic = "force-dynamic";
// Resolver los MX de muchos dominios distintos lleva su tiempo.
export const maxDuration = 300;

const schema = z.object({
  /** Contactos concretos; si se omite, se comprueba según los filtros. */
  ids: z.array(z.string()).optional(),
  listId: z.string().optional(),
  /** Si es false, se vuelven a comprobar también los ya comprobados. */
  onlyUnchecked: z.boolean().default(true),
  limit: z.number().int().min(1).max(5000).default(2000),
});

/**
 * Comprueba direcciones ya guardadas.
 *
 * Las listas envejecen: la gente cambia de empresa y los dominios caducan. Una
 * pasada antes de una campaña grande evita rebotes que, acumulados, empeoran la
 * entrega de todo lo que se envíe después.
 */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "Los datos no son válidos.");

    const { ids, listId, onlyUnchecked, limit } = parsed.data;

    const contacts = await prisma.contact.findMany({
      where: {
        ...(ids?.length ? { id: { in: ids } } : {}),
        ...(listId ? { memberships: { some: { listId } } } : {}),
        ...(onlyUnchecked && !ids?.length ? { verification: VERIFICATION.UNKNOWN } : {}),
      },
      select: { id: true, email: true },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    if (contacts.length === 0) {
      return { checked: 0, valid: 0, risky: 0, invalid: 0, message: "No hay contactos pendientes de comprobar." };
    }

    const results = await verifyEmails(contacts.map((contact) => contact.email));
    const byEmail = new Map(results.map((result) => [result.email, result]));

    const now = new Date();
    let valid = 0;
    let risky = 0;
    let invalid = 0;

    // Se guardan de uno en uno porque cada contacto recibe un resultado
    // distinto; son como mucho unos miles y sólo se hace bajo petición.
    for (const contact of contacts) {
      const result = byEmail.get(contact.email);
      if (!result) continue;

      if (result.verification === VERIFICATION.VALID) valid += 1;
      if (result.verification === VERIFICATION.RISKY) risky += 1;
      if (result.verification === VERIFICATION.INVALID) invalid += 1;

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          verification: result.verification,
          verificationReason: result.reason,
          verifiedAt: now,
        },
      });
    }

    return {
      checked: contacts.length,
      valid,
      risky,
      invalid,
      message:
        invalid > 0
          ? `${invalid} dirección(es) no válidas: quedan fuera de los próximos envíos.`
          : `Todo correcto: ${valid} válidas y ${risky} dudosas.`,
    };
  });
}
