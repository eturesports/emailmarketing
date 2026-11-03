import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiAdmin, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { LEAD_AUDIENCE } from "@/lib/constants";
import { normalizeFormIds } from "@/lib/leads";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1, "El origen necesita un nombre.").max(80),
  slug: z.string().max(60).optional(),
  audience: z.enum([LEAD_AUDIENCE.PARENT, LEAD_AUDIENCE.PLAYER, LEAD_AUDIENCE.OTHER]).default("OTHER"),
  metaFormIds: z.string().max(2000).optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireApiUser();
    return { sources: await prisma.leadSource.findMany({ orderBy: { createdAt: "asc" } }) };
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiAdmin();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Datos no válidos.");

    const slug = slugify(parsed.data.slug || parsed.data.name);
    if (!slug) throw new ApiError(400, "El identificador no es válido.");
    if (await prisma.leadSource.findUnique({ where: { slug } })) {
      throw new ApiError(409, `Ya existe un origen con el identificador «${slug}».`);
    }

    const source = await prisma.leadSource.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        audience: parsed.data.audience,
        metaFormIds: JSON.stringify(normalizeFormIds(parsed.data.metaFormIds ?? "")),
      },
    });
    return { source };
  });
}
