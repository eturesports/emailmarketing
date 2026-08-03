import { prisma } from "./db";
import { CONTACT_STATUS, EVENT_TYPE } from "./constants";

export type UnsubscribeOutcome = {
  ok: boolean;
  alreadyUnsubscribed: boolean;
  email?: string;
};

/**
 * Da de baja a un contacto a partir de su token público.
 *
 * Es idempotente: pulsar dos veces el enlace, o que el cliente de correo
 * pre-cargue el enlace de un clic, no debe contar la baja dos veces ni fallar.
 */
export async function unsubscribeByToken(token: string, campaignId?: string | null): Promise<UnsubscribeOutcome> {
  const contact = await prisma.contact.findUnique({ where: { unsubscribeToken: token } });
  if (!contact) return { ok: false, alreadyUnsubscribed: false };

  if (contact.status === CONTACT_STATUS.UNSUBSCRIBED) {
    return { ok: true, alreadyUnsubscribed: true, email: contact.email };
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: { status: CONTACT_STATUS.UNSUBSCRIBED, unsubscribedAt: new Date() },
  });

  const recipient = campaignId
    ? await prisma.recipient.findUnique({
        where: { campaignId_contactId: { campaignId, contactId: contact.id } },
      })
    : null;

  if (recipient) {
    await prisma.recipient.update({
      where: { id: recipient.id },
      data: { unsubscribedAt: new Date() },
    });
    await prisma.campaign.update({
      where: { id: campaignId! },
      data: { unsubCount: { increment: 1 } },
    });
  }

  await prisma.event.create({
    data: {
      type: EVENT_TYPE.UNSUBSCRIBE,
      contactId: contact.id,
      campaignId: recipient ? campaignId : null,
      recipientId: recipient?.id ?? null,
    },
  });

  return { ok: true, alreadyUnsubscribed: false, email: contact.email };
}

/** Vuelve a suscribir a un contacto desde la página pública de baja. */
export async function resubscribeByToken(token: string): Promise<UnsubscribeOutcome> {
  const contact = await prisma.contact.findUnique({ where: { unsubscribeToken: token } });
  if (!contact) return { ok: false, alreadyUnsubscribed: false };

  await prisma.contact.update({
    where: { id: contact.id },
    data: { status: CONTACT_STATUS.SUBSCRIBED, unsubscribedAt: null },
  });

  return { ok: true, alreadyUnsubscribed: false, email: contact.email };
}
