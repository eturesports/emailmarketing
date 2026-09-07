import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, isAdmin, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { ROLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  signatureHtml: z.string().max(20_000).nullable().optional(),
});

/**
 * Preferencias personales del usuario.
 *
 * Todo lo relativo al envío (dirección, transporte, cuota, ritmo) vive ahora en
 * los remitentes: ver /api/senders. Un usuario es alguien que entra en la
 * plataforma, no una dirección que envía.
 */
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Los ajustes no son válidos.");

    const updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data });
    return { user: { id: updated.id, signatureHtml: updated.signatureHtml } };
  });
}

const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
  isActive: z.boolean().optional(),
});

/** Gestión del equipo: sólo administradores. */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();
    if (!isAdmin(user)) throw new ApiError(403, "Necesitas permisos de administrador.");

    const parsed = memberSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Datos no válidos.");

    const { userId, role, isActive } = parsed.data;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new ApiError(404, "El usuario no existe.");

    if (target.id === user.id && isActive === false) {
      throw new ApiError(400, "No puedes desactivar tu propia cuenta.");
    }
    // Sin esta comprobación, un administrador podría degradar al propietario y
    // dejar la instalación sin nadie capaz de gestionar el equipo.
    if (target.role === ROLE.OWNER && user.role !== ROLE.OWNER) {
      throw new ApiError(403, "Sólo el propietario puede modificar su propia cuenta.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });

    return { user: { id: updated.id, role: updated.role, isActive: updated.isActive } };
  });
}
