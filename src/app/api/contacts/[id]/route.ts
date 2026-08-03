import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { CONTACT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  email: z.string().min(3).optional(),
  firstName: z.string().max(120).nullable().optional(),
  lastName: z.string().max(120).nullable().optional(),
  company: z.string().max(160).nullable().optional(),
  jobTitle: z.string().max(160).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"]).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  listIds: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new ApiError(404, "El contacto no existe.");

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los datos del contacto no son válidos.");

    const { listIds, customFields, email, status, ...fields } = parsed.data;

    if (email !== undefined) {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) throw new ApiError(400, "La dirección de correo no tiene un formato válido.");

      const clash = await prisma.contact.findUnique({ where: { email: normalized } });
      if (clash && clash.id !== id) throw new ApiError(409, "Otro contacto ya usa esa dirección de correo.");
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...fields,
        ...(email !== undefined ? { email: normalizeEmail(email) } : {}),
        ...(customFields ? { customFields: JSON.stringify(customFields) } : {}),
        ...(status
          ? {
              status,
              // Marcar la fecha del cambio de estado permite distinguir después
              // una baja voluntaria de un contacto que nunca llegó a suscribirse.
              unsubscribedAt: status === CONTACT_STATUS.UNSUBSCRIBED ? new Date() : null,
              bouncedAt: status === CONTACT_STATUS.BOUNCED ? new Date() : contact.bouncedAt,
            }
          : {}),
      },
    });

    if (listIds) {
      await prisma.listMembership.deleteMany({ where: { contactId: id } });
      if (listIds.length > 0) {
        await prisma.listMembership.createMany({
          data: listIds.map((listId) => ({ listId, contactId: id })),
        });
      }
    }

    return { contact: updated };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireApiUser();
    const { id } = await params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new ApiError(404, "El contacto no existe.");

    await prisma.contact.delete({ where: { id } });
    return { ok: true };
  });
}
