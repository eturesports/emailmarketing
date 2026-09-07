import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { CAMPAIGN_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1, "La campaña necesita un nombre.").max(160),
  subject: z.string().max(300).optional(),
  templateId: z.string().optional(),
  listIds: z.array(z.string()).optional(),
  senderId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Datos no válidos.");
    }

    const { name, subject, templateId, listIds = [], senderId } = parsed.data;

    // Remitente por defecto: el pedido, o el propio del usuario, o el primero
    // activo que haya. Sin remitente no se puede crear una campaña.
    const sender =
      (senderId ? await prisma.sender.findFirst({ where: { id: senderId, isActive: true } }) : null) ??
      (await prisma.sender.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.sender.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));

    if (!sender) {
      throw new ApiError(
        400,
        "No hay ningún remitente configurado. Crea uno en Remitentes antes de preparar una campaña.",
      );
    }

    // Al partir de una plantilla se copia su contenido: la campaña queda
    // desacoplada, de modo que editar la plantilla luego no altera lo enviado.
    const template = templateId ? await prisma.template.findUnique({ where: { id: templateId } }) : null;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject: subject || template?.subject || "",
        html: template?.html ?? DEFAULT_HTML,
        previewText: template?.previewText ?? null,
        templateId: template?.id ?? null,
        senderId: sender.id,
        createdById: user.id,
        fromName: sender.fromName,
        replyTo: sender.replyTo,
        sendRatePerHour: sender.sendRatePerHour,
        status: CAMPAIGN_STATUS.DRAFT,
        ...(listIds.length > 0 ? { lists: { create: listIds.map((listId) => ({ listId })) } } : {}),
      },
    });

    return { campaign };
  });
}

const DEFAULT_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;">
  <p>Hola {{firstName | equipo}},</p>
  <p>Escribe aquí tu mensaje.</p>
  <p>Un saludo,<br />El equipo de Eture Esports</p>
</div>`;
