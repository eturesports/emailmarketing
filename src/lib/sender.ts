import type { Campaign, Contact, User } from "@prisma/client";
import { prisma } from "./db";
import { CAMPAIGN_STATUS, CONTACT_STATUS, EVENT_TYPE, RECIPIENT_STATUS } from "./constants";
import { GoogleAuthError, describeError } from "./google";
import { classifyGmailError } from "./gmail";
import { buildMergeContext, htmlToPlainText, renderTemplate } from "./merge";
import { oneClickUnsubscribeUrl, prepareHtmlForSend } from "./tracking";
import { openTransport, transportReadiness, type SendContext } from "./transport";
import { getCapacity, recordSend, type SenderCapacity } from "./quota";
import { env } from "./env";

/**
 * Motor de envío.
 *
 * El envío no ocurre en la petición HTTP que pulsa «Enviar»: ahí sólo se
 * materializa la cola y se marca la campaña como SENDING. Un worker
 * (/api/cron, invocado por Vercel Cron, cron del sistema o `npm run worker`)
 * va vaciando esa cola en lotes.
 *
 * Una campaña puede repartirse entre **varias cuentas remitentes**. El límite
 * de Google es por cuenta, así que el techo diario de una campaña es la suma de
 * la capacidad de todas sus cuentas: cuatro cuentas con el relay SMTP dan
 * 40.000 correos cada 24 h frente a los 2.000 de una sola cuenta por la API.
 */

const MAX_ATTEMPTS = 3;

// --- Materialización de la cola ---------------------------------------------

export type BuildQueueResult = {
  added: number;
  skippedUnsubscribed: number;
  skippedBounced: number;
  alreadyQueued: number;
  total: number;
};

/**
 * Crea una fila Recipient por cada contacto de las listas de la campaña.
 *
 * Es idempotente: se puede llamar varias veces (por ejemplo si se añade una
 * lista a un borrador) y sólo añade los que faltan.
 */
export async function buildQueue(campaignId: string): Promise<BuildQueueResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { lists: true },
  });
  if (!campaign) throw new Error("La campaña no existe.");

  const listIds = campaign.lists.map((entry) => entry.listId);
  if (listIds.length === 0) {
    return { added: 0, skippedUnsubscribed: 0, skippedBounced: 0, alreadyQueued: 0, total: 0 };
  }

  // Un contacto que esté en varias listas de la campaña recibe un solo correo:
  // el distinct sobre contactId lo garantiza.
  const memberships = await prisma.listMembership.findMany({
    where: { listId: { in: listIds } },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const contactIds = memberships.map((entry) => entry.contactId);

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, status: true },
  });

  const existing = await prisma.recipient.findMany({
    where: { campaignId },
    select: { contactId: true },
  });
  const alreadyQueuedIds = new Set(existing.map((entry) => entry.contactId));

  let skippedUnsubscribed = 0;
  let skippedBounced = 0;
  let alreadyQueued = 0;
  const toCreate: string[] = [];

  for (const contact of contacts) {
    if (alreadyQueuedIds.has(contact.id)) {
      alreadyQueued += 1;
      continue;
    }
    if (contact.status === CONTACT_STATUS.UNSUBSCRIBED || contact.status === CONTACT_STATUS.COMPLAINED) {
      skippedUnsubscribed += 1;
      continue;
    }
    if (contact.status === CONTACT_STATUS.BOUNCED) {
      skippedBounced += 1;
      continue;
    }
    toCreate.push(contact.id);
  }

  if (toCreate.length > 0) {
    // Ya se han descartado los que estaban en cola, así que no hace falta
    // `skipDuplicates` (que además SQLite no soporta).
    await prisma.recipient.createMany({
      data: toCreate.map((contactId) => ({ campaignId, contactId })),
    });
  }

  const total = await prisma.recipient.count({ where: { campaignId } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { totalRecipients: total } });

  return { added: toCreate.length, skippedUnsubscribed, skippedBounced, alreadyQueued, total };
}

// --- Grupo de remitentes -----------------------------------------------------

/**
 * Cuentas que se reparten una campaña.
 *
 * Si no se ha elegido ninguna explícitamente, envía sólo quien creó la campaña,
 * que es el comportamiento esperado para un envío pequeño.
 */
export async function getCampaignSenders(campaignId: string): Promise<User[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { senders: { include: { user: true } }, sender: true },
  });
  if (!campaign) return [];

  const pool = campaign.senders.map((entry) => entry.user).filter((user) => user.isActive && user.canSend);

  return pool.length > 0 ? pool : [campaign.sender];
}

export type PoolCapacity = {
  senders: Array<{
    id: string;
    email: string;
    name: string | null;
    transport: string;
    used: number;
    limit: number;
    remaining: number;
    ready: boolean;
    reason?: string;
  }>;
  totalRemaining: number;
  totalLimit: number;
};

/** Capacidad conjunta de las cuentas de una campaña, para mostrarla antes de enviar. */
export async function getPoolCapacity(campaignId: string): Promise<PoolCapacity> {
  const users = await getCampaignSenders(campaignId);
  const capacity = await getCapacity(users);

  const senders = capacity.map((entry) => {
    const readiness = transportReadiness(entry.user);
    return {
      id: entry.user.id,
      email: entry.user.email,
      name: entry.user.name,
      transport: entry.user.transport,
      used: entry.used,
      limit: entry.limit,
      remaining: readiness.ready ? entry.remaining : 0,
      ready: readiness.ready,
      reason: readiness.reason,
    };
  });

  return {
    senders,
    totalRemaining: senders.reduce((total, entry) => total + entry.remaining, 0),
    totalLimit: senders.reduce((total, entry) => total + (entry.ready ? entry.limit : 0), 0),
  };
}

// --- Ritmo de envío ----------------------------------------------------------

/**
 * Cuántos correos caben en esta pasada sin superar el ritmo por hora de la
 * campaña. Enviar 2.000 correos en dos minutos es la forma más rápida de que
 * Google limite las cuentas, aunque quede cuota de sobra.
 */
async function allowanceForThisPass(campaign: Campaign, batchSize: number): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 3_600_000);

  const sentLastHour = await prisma.recipient.count({
    where: { campaignId: campaign.id, status: RECIPIENT_STATUS.SENT, sentAt: { gte: oneHourAgo } },
  });

  return Math.max(0, Math.min(batchSize, campaign.sendRatePerHour - sentLastHour));
}

// --- Renderizado -------------------------------------------------------------

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/** Aplica etiquetas de combinación, pie de baja y seguimiento a un destinatario. */
export function renderForContact(
  campaign: Pick<
    Campaign,
    "id" | "subject" | "html" | "trackOpens" | "trackClicks" | "includeUnsubscribe" | "fromName"
  >,
  contact: Contact,
  trackingId: string,
  senderName: string,
): RenderedEmail {
  const context = buildMergeContext(contact);

  // El asunto es texto plano, así que no se escapa; el HTML sí, para que el
  // valor de un campo no pueda inyectar marcado.
  const subject = renderTemplate(campaign.subject, context);
  const bodyHtml = renderTemplate(campaign.html, context, { escape: true });

  const html = prepareHtmlForSend({
    html: bodyHtml,
    trackingId,
    campaignId: campaign.id,
    unsubscribeToken: contact.unsubscribeToken,
    senderName,
    trackOpens: campaign.trackOpens,
    trackClicks: campaign.trackClicks,
    includeUnsubscribe: campaign.includeUnsubscribe,
  });

  return { subject, html, text: htmlToPlainText(html) };
}

// --- Procesado de la cola ----------------------------------------------------

export type ProcessResult = {
  campaignId: string;
  processed: number;
  sent: number;
  failed: number;
  stopped?: "quota" | "rate" | "empty" | "auth" | "done";
  message?: string;
  /** Cuántos correos ha puesto cada cuenta en esta pasada. */
  perSender?: Record<string, number>;
};

/** Estado de una cuenta durante una pasada. */
export type Slot = {
  capacity: SenderCapacity;
  remaining: number;
  context: SendContext | null;
  disabled: boolean;
  sent: number;
};

/**
 * Envía como mucho `batchSize` correos pendientes de una campaña, repartiéndolos
 * entre las cuentas del grupo de remitentes.
 */
export async function processCampaign(campaignId: string, batchSize = env.cronBatchSize): Promise<ProcessResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

  if (!campaign) throw new Error("La campaña no existe.");
  if (campaign.status !== CAMPAIGN_STATUS.SENDING) {
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "done", message: "La campaña no está enviando." };
  }

  const users = await getCampaignSenders(campaignId);
  if (users.length === 0) {
    await pause(campaignId, "La campaña no tiene ninguna cuenta remitente disponible.");
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "auth" };
  }

  const capacities = await getCapacity(users);

  // Sólo entran al reparto las cuentas listas para enviar y con cuota.
  const slots: Slot[] = [];
  const notReady: string[] = [];

  for (const capacity of capacities) {
    const readiness = transportReadiness(capacity.user);
    if (!readiness.ready) {
      notReady.push(readiness.reason ?? capacity.user.email);
      continue;
    }
    if (capacity.remaining <= 0) continue;
    slots.push({ capacity, remaining: capacity.remaining, context: null, disabled: false, sent: 0 });
  }

  if (slots.length === 0) {
    const message =
      notReady.length > 0
        ? notReady.join(" ")
        : `Todas las cuentas de la campaña han agotado su cuota de las últimas 24 h. El envío se reanudará solo según se libere.`;

    await prisma.campaign.update({ where: { id: campaignId }, data: { lastError: message } });
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: notReady.length > 0 ? "auth" : "quota", message };
  }

  const rateAllowance = await allowanceForThisPass(campaign, batchSize);
  if (rateAllowance <= 0) {
    return {
      campaignId,
      processed: 0,
      sent: 0,
      failed: 0,
      stopped: "rate",
      message: `Alcanzado el ritmo de ${campaign.sendRatePerHour} correos/hora.`,
    };
  }

  const poolRemaining = slots.reduce((total, slot) => total + slot.remaining, 0);
  const limit = Math.min(rateAllowance, poolRemaining);

  const pending = await prisma.recipient.findMany({
    where: { campaignId, status: RECIPIENT_STATUS.PENDING },
    include: { contact: true },
    orderBy: { id: "asc" },
    take: limit,
  });

  if (pending.length === 0) {
    await finalizeIfComplete(campaignId);
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "empty" };
  }

  let sent = 0;
  let failed = 0;
  let cursor = 0;

  try {
    for (const recipient of pending) {
      const contact = recipient.contact;

      // El contacto pudo darse de baja entre que se creó la cola y ahora.
      if (contact.status !== CONTACT_STATUS.SUBSCRIBED) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: RECIPIENT_STATUS.SKIPPED, error: "El contacto ya no está suscrito." },
        });
        continue;
      }

      const slot = nextSlot(slots, cursor);
      if (!slot) break; // todas las cuentas agotadas o caídas en esta pasada
      cursor = slot.index + 1;

      const user = slot.slot.capacity.user;

      // La conexión se abre en el primer correo de cada cuenta y se reutiliza
      // para el resto del lote.
      if (!slot.slot.context) {
        try {
          slot.slot.context = await openTransport(user);
        } catch (error) {
          slot.slot.disabled = true;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { lastError: describeError(error) },
          });
          continue;
        }
      }

      const fromName = campaign.fromName || user.fromName || user.name || "Eture Esports";
      const replyTo = campaign.replyTo || user.replyTo || null;
      const rendered = renderForContact(campaign, contact, recipient.trackingId, fromName);

      try {
        const result = await slot.slot.context.send({
          from: user.email,
          fromName,
          to: contact.email,
          toName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          replyTo,
          listUnsubscribeUrl: campaign.includeUnsubscribe
            ? oneClickUnsubscribeUrl(contact.unsubscribeToken, campaign.id)
            : null,
        });

        await prisma.$transaction([
          prisma.recipient.update({
            where: { id: recipient.id },
            data: {
              status: RECIPIENT_STATUS.SENT,
              sentAt: new Date(),
              senderId: user.id,
              gmailMessageId: result.messageId || null,
              gmailThreadId: result.threadId || null,
              attempts: { increment: 1 },
              error: null,
            },
          }),
          prisma.contact.update({ where: { id: contact.id }, data: { lastSentAt: new Date() } }),
          prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: { increment: 1 } } }),
          prisma.event.create({
            data: { type: EVENT_TYPE.SENT, campaignId, contactId: contact.id, recipientId: recipient.id },
          }),
        ]);

        await recordSend(user.id);
        slot.slot.remaining -= 1;
        slot.slot.sent += 1;
        sent += 1;
      } catch (error) {
        const classified = classifyGmailError(error);
        const attempts = recipient.attempts + 1;
        const giveUp = !classified.retryable || attempts >= MAX_ATTEMPTS;

        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            status: giveUp ? RECIPIENT_STATUS.FAILED : RECIPIENT_STATUS.PENDING,
            attempts,
            error: `[${user.email}] ${classified.message}`,
          },
        });

        if (giveUp) {
          failed += 1;
          await prisma.$transaction([
            prisma.campaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 } } }),
            prisma.event.create({
              data: {
                type: EVENT_TYPE.FAILED,
                campaignId,
                contactId: contact.id,
                recipientId: recipient.id,
                meta: classified.message,
              },
            }),
          ]);
        }

        // Si Google limita o revoca **esta** cuenta, se aparta y el lote sigue
        // con las demás: con varias cuentas, que una se caiga no debe detener
        // la campaña entera.
        if (classified.status === 429 || classified.status === 403 || classified.status === 401) {
          slot.slot.disabled = true;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { lastError: `[${user.email}] ${classified.message}` },
          });
        }
      }
    }
  } finally {
    await Promise.all(
      slots.map(async (slot) => {
        try {
          await slot.context?.close();
        } catch {
          // Cerrar la conexión nunca debe tumbar la pasada.
        }
      }),
    );
  }

  const allDown = slots.every((slot) => slot.disabled);
  if (allDown && sent === 0) {
    await pause(campaignId, "Todas las cuentas remitentes han fallado. Revisa sus credenciales en Ajustes.");
    return { campaignId, processed: pending.length, sent, failed, stopped: "auth" };
  }

  await finalizeIfComplete(campaignId);

  return {
    campaignId,
    processed: pending.length,
    sent,
    failed,
    perSender: Object.fromEntries(
      slots.filter((slot) => slot.sent > 0).map((slot) => [slot.capacity.user.email, slot.sent]),
    ),
  };
}

/**
 * Siguiente cuenta del turno rotatorio con cuota disponible.
 *
 * El reparto es circular para que todas las cuentas envíen a un ritmo parecido:
 * concentrar los envíos en una sola y pasar a la siguiente al agotarla haría que
 * el dominio muestre un patrón mucho menos natural.
 */
export function nextSlot(slots: Slot[], cursor: number): { slot: Slot; index: number } | null {
  for (let step = 0; step < slots.length; step += 1) {
    const index = (cursor + step) % slots.length;
    const slot = slots[index];
    if (!slot.disabled && slot.remaining > 0) return { slot, index };
  }
  return null;
}

async function pause(campaignId: string, message: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: CAMPAIGN_STATUS.PAUSED, lastError: message },
  });
}

/** Marca la campaña como enviada cuando ya no queda nada pendiente. */
async function finalizeIfComplete(campaignId: string): Promise<void> {
  const pending = await prisma.recipient.count({
    where: { campaignId, status: { in: [RECIPIENT_STATUS.PENDING, RECIPIENT_STATUS.SENDING] } },
  });
  if (pending > 0) return;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== CAMPAIGN_STATUS.SENDING) return;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: CAMPAIGN_STATUS.SENT, completedAt: new Date() },
  });
}

// --- Entrada del worker ------------------------------------------------------

export type CronResult = {
  activated: string[];
  processed: ProcessResult[];
};

/**
 * Una pasada del worker: activa las campañas programadas cuya hora ya llegó y
 * procesa un lote de cada campaña en curso.
 */
export async function runQueue(batchSize = env.cronBatchSize): Promise<CronResult> {
  const now = new Date();

  const due = await prisma.campaign.findMany({
    where: { status: CAMPAIGN_STATUS.SCHEDULED, scheduledAt: { lte: now } },
    select: { id: true },
  });

  const activated: string[] = [];
  for (const campaign of due) {
    await buildQueue(campaign.id);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CAMPAIGN_STATUS.SENDING, startedAt: new Date(), lastError: null },
    });
    activated.push(campaign.id);
  }

  const sending = await prisma.campaign.findMany({
    where: { status: CAMPAIGN_STATUS.SENDING },
    select: { id: true },
    orderBy: { startedAt: "asc" },
  });

  const processed: ProcessResult[] = [];
  for (const campaign of sending) {
    try {
      processed.push(await processCampaign(campaign.id, batchSize));
    } catch (error) {
      const message = describeError(error);
      console.error(`[worker] campaña ${campaign.id}:`, message);
      await prisma.campaign.update({ where: { id: campaign.id }, data: { lastError: message } });
      processed.push({ campaignId: campaign.id, processed: 0, sent: 0, failed: 0, message });
    }
  }

  return { activated, processed };
}

// --- Envío de prueba ---------------------------------------------------------

/** Manda una previsualización a una dirección concreta, sin tocar la cola. */
export async function sendTestEmail(
  campaign: Campaign & { sender: User },
  toEmail: string,
  sampleContact: Contact | null,
): Promise<void> {
  const context = await openTransport(campaign.sender);
  const fromName = campaign.fromName || campaign.sender.fromName || campaign.sender.name || "Eture Esports";

  const contact: Contact =
    sampleContact ??
    ({
      id: "preview",
      email: toEmail,
      firstName: "Nombre",
      lastName: "Apellido",
      company: "Eture Esports",
      jobTitle: null,
      phone: null,
      country: null,
      language: null,
      customFields: "{}",
      status: CONTACT_STATUS.SUBSCRIBED,
      source: "manual",
      unsubscribeToken: "preview",
      notes: null,
      lastSentAt: null,
      bouncedAt: null,
      unsubscribedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Contact);

  const context_ = buildMergeContext(contact);
  const subject = `[PRUEBA] ${renderTemplate(campaign.subject, context_)}`;
  const html = renderTemplate(campaign.html, context_, { escape: true });

  try {
    await context.send({
      from: campaign.sender.email,
      fromName,
      to: toEmail,
      subject,
      // En la prueba no se inyecta píxel ni se reescriben enlaces: no queremos
      // que un envío de prueba contamine las estadísticas de la campaña.
      html,
      text: htmlToPlainText(html),
      replyTo: campaign.replyTo || campaign.sender.replyTo || null,
    });
  } finally {
    await context.close();
  }

  // La prueba también consume cuota de Google, así que se contabiliza.
  await recordSend(campaign.sender.id);
}

export { GoogleAuthError };
export { getRemainingQuota, getSentInWindow } from "./quota";
