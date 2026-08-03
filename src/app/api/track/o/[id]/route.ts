import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { TRACKING_PIXEL } from "@/lib/tracking";
import { EVENT_TYPE } from "@/lib/constants";
import { hashIp } from "@/lib/crypto";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Píxel de apertura. Devuelve siempre el GIF, pase lo que pase: si el registro
 * falla, el destinatario no debe ver un hueco roto en el correo.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const trackingId = id.replace(/\.gif$/i, "");

  try {
    await recordOpen(trackingId, request);
  } catch (error) {
    console.error("[track/open]", error);
  }

  return new NextResponse(new Uint8Array(TRACKING_PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRACKING_PIXEL.length),
      // Sin esto, el proxy de imágenes de Gmail cachearía el píxel y sólo se
      // contabilizaría la primera apertura de cada destinatario.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function recordOpen(trackingId: string, request: NextRequest): Promise<void> {
  const recipient = await prisma.recipient.findUnique({ where: { trackingId } });
  if (!recipient) return;

  const now = new Date();
  const isFirstOpen = recipient.firstOpenedAt === null;

  await prisma.recipient.update({
    where: { id: recipient.id },
    data: {
      openCount: { increment: 1 },
      lastOpenedAt: now,
      ...(isFirstOpen ? { firstOpenedAt: now } : {}),
    },
  });

  // El contador de la campaña cuenta aperturas únicas, así que sólo sube la
  // primera vez que abre cada destinatario.
  if (isFirstOpen) {
    await prisma.campaign.update({
      where: { id: recipient.campaignId },
      data: { openCount: { increment: 1 } },
    });
  }

  await prisma.event.create({
    data: {
      type: EVENT_TYPE.OPEN,
      campaignId: recipient.campaignId,
      contactId: recipient.contactId,
      recipientId: recipient.id,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      ipHash: hashIp(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()),
    },
  });
}
