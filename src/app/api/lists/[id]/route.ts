import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const membersSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    if (parsed.data.name) {
      const clash = await prisma.contactList.findUnique({ where: { name: parsed.data.name } });
      if (clash && clash.id !== id) throw new ApiError(409, "Ya existe otra lista con ese nombre.");
    }

    const list = await prisma.contactList.update({ where: { id }, data: parsed.data });
    return { list };
  });
}

/** Añade o quita contactos de la lista. */
export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const list = await prisma.contactList.findUnique({ where: { id } });
    if (!list) throw new ApiError(404, "La lista no existe.");

    const parsed = membersSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    const { add = [], remove = [] } = parsed.data;
    let added = 0;

    if (add.length > 0) {
      const existing = await prisma.listMembership.findMany({
        where: { listId: id, contactId: { in: add } },
        select: { contactId: true },
      });
      const known = new Set(existing.map((entry) => entry.contactId));
      const missing = add.filter((contactId) => !known.has(contactId));

      if (missing.length > 0) {
        await prisma.listMembership.createMany({
          data: missing.map((contactId) => ({ listId: id, contactId })),
        });
      }
      added = missing.length;
    }

    let removed = 0;
    if (remove.length > 0) {
      const result = await prisma.listMembership.deleteMany({
        where: { listId: id, contactId: { in: remove } },
      });
      removed = result.count;
    }

    return { added, removed };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const list = await prisma.contactList.findUnique({
      where: { id },
      include: { _count: { select: { campaignLists: true } } },
    });
    if (!list) throw new ApiError(404, "La lista no existe.");

    // Borrar la lista dejaría campañas sin destinatarios de forma silenciosa.
    if (list._count.campaignLists > 0) {
      throw new ApiError(
        409,
        `No se puede borrar: la lista se usa en ${list._count.campaignLists} campaña(s). Quítala de esas campañas primero.`,
      );
    }

    await prisma.contactList.delete({ where: { id } });
    return { ok: true };
  });
}
