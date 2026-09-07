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

  // Se busca el envío inicial de esa campaña: es el que representa la relación
  // del contacto con ella, y del que cuelgan los seguimientos.
  const recipient = campaignId
    ? await prisma.recipient.findUnique({
        where: { campaignId_contactId_stepKey: { campaignId, contactId: contact.id, stepKey: "initial" } },
      })
    : null;

  if (recipient) {
    await prisma.recipient.update({
      where: { id: recipient.id },
      data: { unsubscribedAt: new Date() },
    });

    // Cancela los seguimientos que aún no han salido: seguir escribiendo a
    // quien acaba de darse de baja es justo lo que no debe pasar.
    await prisma.recipient.updateMany({
      where: { rootId: recipient.id, status: "PENDING" },
      data: { status: "SKIPPED", error: "El contacto se dio de baja antes del seguimiento." },
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
