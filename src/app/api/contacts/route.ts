import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { CONTACT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().min(3),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  company: z.string().max(160).optional(),
  jobTitle: z.string().max(160).optional(),
  phone: z.string().max(60).optional(),
  country: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  listIds: z.array(z.string()).optional(),
});

/** Búsqueda paginada de contactos, usada por los selectores del panel. */
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const params = request.nextUrl.searchParams;
    const query = params.get("q")?.trim() ?? "";
    const status = params.get("status") ?? "";
    const listId = params.get("listId") ?? "";
    const take = Math.min(200, Math.max(1, Number.parseInt(params.get("take") ?? "50", 10) || 50));

    const contacts = await prisma.contact.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { email: { contains: query } },
                { firstName: { contains: query } },
                { lastName: { contains: query } },
                { company: { contains: query } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(listId ? { memberships: { some: { listId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, email: true, firstName: true, lastName: true, company: true, status: true },
    });

    return { contacts };
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos del contacto no son válidos.");

    const { listIds = [], customFields, ...fields } = parsed.data;
    const email = normalizeEmail(fields.email);

    if (!isValidEmail(email)) throw new ApiError(400, "La dirección de correo no tiene un formato válido.");

    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Ya existe un contacto con esa dirección de correo.");

    const contact = await prisma.contact.create({
      data: {
        ...fields,
        email,
        status: CONTACT_STATUS.SUBSCRIBED,
        source: "manual",
        customFields: JSON.stringify(customFields ?? {}),
      },
    });

    if (listIds.length > 0) {
      await prisma.listMembership.createMany({
        data: listIds.map((listId) => ({ listId, contactId: contact.id })),
      });
    }

    return { contact };
  });
}
