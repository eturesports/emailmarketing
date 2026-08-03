import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1, "La lista necesita un nombre.").max(120),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "El color debe estar en formato hexadecimal.")
    .optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireApiUser();

    const lists = await prisma.contactList.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } } },
    });

    return {
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        color: list.color,
        contactCount: list._count.memberships,
      })),
    };
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Datos no válidos.");
    }

    const existing = await prisma.contactList.findUnique({ where: { name: parsed.data.name } });
    if (existing) throw new ApiError(409, "Ya existe una lista con ese nombre.");

    const list = await prisma.contactList.create({ data: parsed.data });
    return { list };
  });
}
