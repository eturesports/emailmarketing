import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decodeClickTarget, verifyUrlSignature } from "@/lib/tracking";
import { EVENT_TYPE } from "@/lib/constants";
import { hashIp } from "@/lib/crypto";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Redirector de clics: registra el clic y manda al destino original.
 *
 * La URL de destino va firmada (ver lib/tracking.ts). Si la firma no cuadra se
 * descarta, para que este endpoint no pueda usarse como redirector abierto
 * hacia sitios de terceros.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: trackingId } = await params;

  const encoded = request.nextUrl.searchParams.get("u");
  const signature = request.nextUrl.searchParams.get("s");

  if (!encoded || !signature) {
    return NextResponse.redirect(absoluteUrl("/"));
  }

  const target = decodeClickTarget(encoded);
  if (!target || !verifyUrlSignature(trackingId, target, signature)) {
    return NextResponse.redirect(absoluteUrl("/"));
  }

  try {
    await recordClick(trackingId, target, request);
  } catch (error) {
    // Un fallo al registrar no debe impedir que el destinatario llegue a donde
    // quería ir: se registra en el log del servidor y se redirige igualmente.
    console.error("[track/click]", error);
  }

  return NextResponse.redirect(target, { status: 302 });
}

async function recordClick(trackingId: string, url: string, request: NextRequest): Promise<void> {
  const recipient = await prisma.recipient.findUnique({ where: { trackingId } });
  if (!recipient) return;

  const isFirstClick = recipient.firstClickedAt === null;
  const now = new Date();

  await prisma.recipient.update({
    where: { id: recipient.id },
    data: {
      clickCount: { increment: 1 },
      ...(isFirstClick ? { firstClickedAt: now } : {}),
      // Un clic implica una apertura, aunque el píxel se haya bloqueado.
      ...(recipient.firstOpenedAt === null ? { firstOpenedAt: now, lastOpenedAt: now } : {}),
    },
  });

  await prisma.campaign.update({
    where: { id: recipient.campaignId },
    data: {
      ...(isFirstClick ? { clickCount: { increment: 1 } } : {}),
      ...(recipient.firstOpenedAt === null ? { openCount: { increment: 1 } } : {}),
    },
  });

  await prisma.event.create({
    data: {
      type: EVENT_TYPE.CLICK,
      campaignId: recipient.campaignId,
      contactId: recipient.contactId,
      recipientId: recipient.id,
      url: url.slice(0, 900),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      ipHash: hashIp(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()),
    },
  });
}
