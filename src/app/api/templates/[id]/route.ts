import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(140).optional(),
  subject: z.string().max(300).optional(),
  html: z.string().max(500_000).optional(),
  previewText: z.string().max(300).nullable().optional(),
  category: z.string().max(80).optional(),
  isArchived: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    const template = await prisma.template.update({ where: { id }, data: parsed.data });
    return { template };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new ApiError(404, "La plantilla no existe.");

    await prisma.template.delete({ where: { id } });
    return { ok: true };
  });
}
