import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getResendWebhookSecret } from "@/lib/settings";
import { verifyResendWebhook, type ResendWebhookEvent } from "@/lib/resend";
import { CONTACT_STATUS, EVENT_TYPE } from "@/lib/constants";
import { normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Webhook de Resend.
 *
 * Es la pieza que Gmail no puede dar: cuando un correo rebota de forma
 * permanente o alguien lo marca como spam, Resend lo notifica aquí y el
 * contacto se retira solo de futuros envíos. Sin esto, la base se degrada
 * campaña a campaña y la reputación del dominio con ella.
 *
 * Configúralo en Resend → Webhooks apuntando a
 * `{APP_URL}/api/webhooks/resend`, y pega el secreto en Ajustes.
 */
export async function POST(request: NextRequest) {
  const secret = await getResendWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "El webhook de Resend no está configurado." }, { status: 503 });
  }

  // La firma se calcula sobre el cuerpo tal cual llegó, así que hay que leerlo
  // como texto antes de convertirlo a JSON.
  const rawBody = await request.text();

  const valid = verifyResendWebhook(
    secret,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    rawBody,
  );

  if (!valid) {
    return NextResponse.json({ error: "Firma no válida." }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    console.error("[webhook/resend]", error);
    // Se responde 200 igualmente: si devolviéramos 500, Resend reintentaría en
    // bucle un evento que quizá nunca vamos a poder procesar.
  }

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: ResendWebhookEvent): Promise<void> {
  const email = event.data?.to?.[0];
  if (!email) return;

  const contact = await prisma.contact.findUnique({ where: { email: normalizeEmail(email) } });
  if (!contact) return;

  // Se localiza el envío concreto por el identificador que devolvió Resend, para
  // poder atribuir el evento a su campaña.
  const recipient = event.data?.email_id
    ? await prisma.recipient.findFirst({
        where: { contactId: contact.id, gmailMessageId: event.data.email_id },
      })
    : null;

  switch (event.type) {
    case "email.bounced": {
      // Sólo los rebotes permanentes retiran al contacto: un buzón lleno o un
      // servidor caído (rebote temporal) no significa que la dirección sea mala.
      const permanent = (event.data?.bounce?.type ?? "").toLowerCase() !== "transient";
      if (!permanent) return;

      await prisma.contact.update({
        where: { id: contact.id },
        data: { status: CONTACT_STATUS.BOUNCED, bouncedAt: new Date() },
      });

      if (recipient) {
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: { bounceCount: { increment: 1 } },
        });
      }

      await prisma.event.create({
        data: {
          type: EVENT_TYPE.BOUNCE,
          contactId: contact.id,
          campaignId: recipient?.campaignId ?? null,
          recipientId: recipient?.id ?? null,
          meta: event.data?.bounce?.message ?? null,
        },
      });
      return;
    }

    case "email.complained": {
      // Una queja por spam es la señal más fuerte que existe: fuera de todos
      // los envíos, sin excepciones.
      await prisma.contact.update({
        where: { id: contact.id },
        data: { status: CONTACT_STATUS.COMPLAINED, unsubscribedAt: new Date() },
      });

      if (recipient) {
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: { unsubCount: { increment: 1 } },
        });
      }

      await prisma.event.create({
        data: {
          type: EVENT_TYPE.UNSUBSCRIBE,
          contactId: contact.id,
          campaignId: recipient?.campaignId ?? null,
          recipientId: recipient?.id ?? null,
          meta: "Marcado como spam (queja recibida desde Resend)",
        },
      });
      return;
    }

    case "email.failed": {
      if (!recipient) return;
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { error: "Resend no pudo entregar el mensaje." },
      });
      return;
    }

    default:
      // El resto de eventos (delivered, opened, clicked…) no se procesan: las
      // aperturas y clics ya se registran con nuestro propio seguimiento, y
      // contarlos dos veces falsearía las estadísticas.
      return;
  }
}
