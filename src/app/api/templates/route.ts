import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1, "La plantilla necesita un nombre.").max(140),
  subject: z.string().max(300).optional(),
  html: z.string().max(500_000).optional(),
  previewText: z.string().max(300).optional(),
  category: z.string().max(80).optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireApiUser();
    const templates = await prisma.template.findMany({
      where: { isArchived: false },
      orderBy: { updatedAt: "desc" },
    });
    return { templates };
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Datos no válidos.");
    }

    const template = await prisma.template.create({ data: parsed.data });
    return { template };
  });
}
