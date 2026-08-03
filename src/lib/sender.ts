import type { Campaign, Contact, User } from "@prisma/client";
import { prisma } from "./db";
import { CAMPAIGN_STATUS, CONTACT_STATUS, EVENT_TYPE, RECIPIENT_STATUS } from "./constants";
import { GoogleAuthError, describeError, getAuthenticatedClient } from "./google";
import { classifyGmailError, sendEmail } from "./gmail";
import { buildMergeContext, htmlToPlainText, renderTemplate } from "./merge";
import { oneClickUnsubscribeUrl, prepareHtmlForSend } from "./tracking";
import { currentDay } from "./utils";
import { env } from "./env";

/**
 * Motor de envío.
 *
 * El envío no ocurre en la petición HTTP que pulsa "Enviar": ahí sólo se
 * materializa la cola y se marca la campaña como SENDING. Un worker
 * (/api/cron, invocado por Vercel Cron, cron del sistema o `npm run worker`)
 * va vaciando esa cola en lotes. Así una campaña de 5.000 correos no depende
 * de que una petición siga viva media hora, y el ritmo de envío se puede
 * limitar para no disparar las alarmas de Gmail.
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

// --- Cuota diaria ------------------------------------------------------------

export async function getSentToday(userId: string): Promise<number> {
  const result = await prisma.sendLog.aggregate({
    where: { userId, day: currentDay() },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}

export async function getRemainingQuota(user: User): Promise<number> {
  const sent = await getSentToday(user.id);
  return Math.max(0, user.dailyQuota - sent);
}

async function recordSend(userId: string, campaignId: string): Promise<void> {
  const day = currentDay();
  await prisma.sendLog.upsert({
    where: { userId_day_campaignId: { userId, day, campaignId } },
    create: { userId, day, campaignId, count: 1 },
    update: { count: { increment: 1 } },
  });
}

// --- Ritmo de envío ----------------------------------------------------------

/**
 * Cuántos correos se pueden mandar en esta pasada sin superar el ritmo por hora
 * configurado en la campaña. Evita mandar 2.000 correos en dos minutos, que es
 * la forma más rápida de que Gmail limite la cuenta.
 */
async function allowanceForThisPass(campaign: Campaign, batchSize: number): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 3_600_000);

  const sentLastHour = await prisma.recipient.count({
    where: { campaignId: campaign.id, status: RECIPIENT_STATUS.SENT, sentAt: { gte: oneHourAgo } },
  });

  return Math.max(0, Math.min(batchSize, campaign.sendRatePerHour - sentLastHour));
}

// --- Envío de un destinatario ------------------------------------------------

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
};

/**
 * Envía como mucho `batchSize` correos pendientes de una campaña.
 * Devuelve por qué paró, para que el worker sepa si merece la pena reintentar.
 */
export async function processCampaign(campaignId: string, batchSize = env.cronBatchSize): Promise<ProcessResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { sender: true },
  });

  if (!campaign) throw new Error("La campaña no existe.");
  if (campaign.status !== CAMPAIGN_STATUS.SENDING) {
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "done", message: "La campaña no está enviando." };
  }

  const sender = campaign.sender;

  const remainingQuota = await getRemainingQuota(sender);
  if (remainingQuota <= 0) {
    return {
      campaignId,
      processed: 0,
      sent: 0,
      failed: 0,
      stopped: "quota",
      message: `${sender.email} ha agotado su cuota diaria (${sender.dailyQuota}). Se reanudará mañana.`,
    };
  }

  const allowance = await allowanceForThisPass(campaign, batchSize);
  if (allowance <= 0) {
    return {
      campaignId,
      processed: 0,
      sent: 0,
      failed: 0,
      stopped: "rate",
      message: `Alcanzado el ritmo de ${campaign.sendRatePerHour} correos/hora.`,
    };
  }

  const limit = Math.min(allowance, remainingQuota);

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

  let auth;
  try {
    auth = await getAuthenticatedClient(sender);
  } catch (error) {
    const message = describeError(error);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CAMPAIGN_STATUS.PAUSED, lastError: message },
    });
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "auth", message };
  }

  const fromName = campaign.fromName || sender.fromName || sender.name || "Eture Esports";
  const replyTo = campaign.replyTo || sender.replyTo || null;

  let sent = 0;
  let failed = 0;

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

    const rendered = renderForContact(campaign, contact, recipient.trackingId, fromName);

    try {
      const result = await sendEmail(auth, {
        from: sender.email,
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
            gmailMessageId: result.messageId,
            gmailThreadId: result.threadId,
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

      await recordSend(sender.id, campaignId);
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
          error: classified.message,
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

      // Si Gmail nos está limitando o revocó el acceso, parar el lote entero:
      // seguir insistiendo sólo empeora la situación.
      if (classified.status === 429 || classified.status === 403 || classified.status === 401) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { lastError: classified.message },
        });

        if (classified.status === 401) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: CAMPAIGN_STATUS.PAUSED },
          });
          return { campaignId, processed: sent + failed, sent, failed, stopped: "auth", message: classified.message };
        }

        return { campaignId, processed: sent + failed, sent, failed, stopped: "quota", message: classified.message };
      }
    }
  }

  await finalizeIfComplete(campaignId);

  return { campaignId, processed: pending.length, sent, failed };
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
  const auth = await getAuthenticatedClient(campaign.sender);
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

  const context = buildMergeContext(contact);
  const subject = `[PRUEBA] ${renderTemplate(campaign.subject, context)}`;
  const html = renderTemplate(campaign.html, context, { escape: true });

  await sendEmail(auth, {
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
}

export { GoogleAuthError };
