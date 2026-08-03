import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { CONTACT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  ids: z.array(z.string()).min(1, "Selecciona al menos un contacto."),
  action: z.enum(["delete", "unsubscribe", "resubscribe", "addToList", "removeFromList"]),
  listId: z.string().optional(),
});

/** Acciones en lote desde la tabla de contactos. */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Petición no válida.");
    }

    const { ids, action, listId } = parsed.data;

    switch (action) {
      case "delete": {
        const { count } = await prisma.contact.deleteMany({ where: { id: { in: ids } } });
        return { affected: count };
      }

      case "unsubscribe": {
        const { count } = await prisma.contact.updateMany({
          where: { id: { in: ids } },
          data: { status: CONTACT_STATUS.UNSUBSCRIBED, unsubscribedAt: new Date() },
        });
        return { affected: count };
      }

      case "resubscribe": {
        const { count } = await prisma.contact.updateMany({
          where: { id: { in: ids } },
          data: { status: CONTACT_STATUS.SUBSCRIBED, unsubscribedAt: null },
        });
        return { affected: count };
      }

      case "addToList": {
        if (!listId) throw new ApiError(400, "Indica a qué lista quieres añadirlos.");

        const existing = await prisma.listMembership.findMany({
          where: { listId, contactId: { in: ids } },
          select: { contactId: true },
        });
        const known = new Set(existing.map((entry) => entry.contactId));
        const missing = ids.filter((id) => !known.has(id));

        if (missing.length > 0) {
          await prisma.listMembership.createMany({
            data: missing.map((contactId) => ({ listId, contactId })),
          });
        }
        return { affected: missing.length };
      }

      case "removeFromList": {
        if (!listId) throw new ApiError(400, "Indica de qué lista quieres quitarlos.");

        const { count } = await prisma.listMembership.deleteMany({
          where: { listId, contactId: { in: ids } },
        });
        return { affected: count };
      }
    }
  });
}
