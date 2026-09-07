import type { Campaign, Contact, Recipient, Sender, SequenceStep, User } from "@prisma/client";
import { prisma } from "./db";
import {
  CAMPAIGN_STATUS,
  CONTACT_STATUS,
  EVENT_TYPE,
  RECIPIENT_STATUS,
  SEQUENCE_CONDITION,
} from "./constants";
import { GoogleAuthError, describeError } from "./google";
import { classifyGmailError } from "./gmail";
import { ResendError, classifyResendError } from "./resend";
import { buildMergeContext, htmlToPlainText, renderTemplate } from "./merge";
import { oneClickUnsubscribeUrl, prepareHtmlForSend } from "./tracking";
import { openTransport, transportReadiness, type SendContext, type SenderWithUser } from "./transport";
import { getCapacity, quotaKeyFor, recordSend, type SenderCapacity } from "./quota";
import { getTrackingBaseUrl } from "./settings";
import { env } from "./env";

/**
 * Motor de envío.
 *
 * El envío no ocurre en la petición HTTP que pulsa «Enviar»: ahí sólo se
 * materializa la cola y se marca la campaña como SENDING. Un worker
 * (/api/cron, Vercel Cron o `npm run worker`) va vaciando esa cola en lotes.
 *
 * La cola es uniforme: cada fila `Recipient` es **un mensaje** a un contacto, ya
 * sea el envío inicial de la campaña o uno de sus seguimientos. Así el ritmo,
 * la cuota, el seguimiento de aperturas y las estadísticas funcionan igual para
 * los dos sin duplicar lógica.
 *
 * Una campaña puede repartirse entre **varios remitentes**. El límite de los
 * proveedores es por cuenta, así que el techo de una campaña es la suma de la
 * capacidad de todos sus remitentes.
 */

const MAX_ATTEMPTS = 3;
const INITIAL_STEP_KEY = "initial";

/** Dominio con el que se firman los Message-ID que generamos. */
function messageDomain(): string {
  try {
    return new URL(env.appUrl).hostname;
  } catch {
    return "eturesports.com";
  }
}

/**
 * Message-ID determinista de un envío.
 *
 * Al derivarse del identificador de la fila no hace falta guardarlo: un
 * seguimiento puede reconstruir el del mensaje original para responder en el
 * mismo hilo, y eso funciona con cualquier transporte, no sólo con Gmail.
 */
export function messageIdFor(recipientId: string): string {
  return `<${recipientId}@${messageDomain()}>`;
}

// --- Materialización de la cola ---------------------------------------------

export type BuildQueueResult = {
  added: number;
  skippedUnsubscribed: number;
  skippedBounced: number;
  alreadyQueued: number;
  total: number;
};

/**
 * Crea el envío inicial para cada contacto de las listas de la campaña.
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

  const contacts = await prisma.contact.findMany({
    where: { id: { in: memberships.map((entry) => entry.contactId) } },
    select: { id: true, status: true },
  });

  const existing = await prisma.recipient.findMany({
    where: { campaignId, stepKey: INITIAL_STEP_KEY },
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
      data: toCreate.map((contactId) => ({ campaignId, contactId, stepKey: INITIAL_STEP_KEY })),
    });
  }

  const total = await prisma.recipient.count({ where: { campaignId, stepKey: INITIAL_STEP_KEY } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { totalRecipients: total } });

  return { added: toCreate.length, skippedUnsubscribed, skippedBounced, alreadyQueued, total };
}

// --- Secuencias de seguimiento ----------------------------------------------

export type FollowUpResult = { campaignId: string; stepId: string; created: number };

/**
 * Encola los seguimientos que ya toca enviar.
 *
 * Se evalúa contra el **envío inicial** de cada contacto: si lo abrió, si pulsó
 * algún enlace y cuándo se envió. Nunca se encola a quien se dio de baja, rebotó
 * o marcó el correo como spam después del primer mensaje: la condición se
 * comprueba en el momento de encolar, no cuando se creó la campaña.
 */
export async function scheduleFollowUps(campaignId?: string): Promise<FollowUpResult[]> {
  const steps = await prisma.sequenceStep.findMany({
    where: { isActive: true, ...(campaignId ? { campaignId } : {}) },
    orderBy: [{ campaignId: "asc" }, { position: "asc" }],
  });

  const results: FollowUpResult[] = [];

  for (const step of steps) {
    const dueBefore = new Date(Date.now() - step.delayHours * 3_600_000);

    // Candidatos: envíos iniciales entregados hace suficiente tiempo cuyo
    // contacto sigue siendo apto y que aún no tienen este seguimiento.
    const roots = await prisma.recipient.findMany({
      where: {
        campaignId: step.campaignId,
        stepKey: INITIAL_STEP_KEY,
        status: RECIPIENT_STATUS.SENT,
        sentAt: { lte: dueBefore },
        unsubscribedAt: null,
        contact: { status: CONTACT_STATUS.SUBSCRIBED },
        follow: { none: { stepId: step.id } },
      },
      select: { id: true, contactId: true, senderId: true, firstOpenedAt: true, clickCount: true },
      take: 5000,
    });

    const eligible = roots.filter((root) => matchesCondition(step.condition, root));
    if (eligible.length === 0) {
      results.push({ campaignId: step.campaignId, stepId: step.id, created: 0 });
      continue;
    }

    await prisma.recipient.createMany({
      data: eligible.map((root) => ({
        campaignId: step.campaignId,
        contactId: root.contactId,
        stepId: step.id,
        stepKey: step.id,
        rootId: root.id,
        // El seguimiento sale del mismo remitente que el mensaje original,
        // salvo que el paso fuerce otro: recibir la continuación de una
        // conversación desde otra dirección resulta desconcertante.
        senderId: step.senderId ?? root.senderId,
        availableAt: new Date(),
      })),
    });

    results.push({ campaignId: step.campaignId, stepId: step.id, created: eligible.length });
  }

  return results;
}

function matchesCondition(
  condition: string,
  root: { firstOpenedAt: Date | null; clickCount: number },
): boolean {
  switch (condition) {
    case SEQUENCE_CONDITION.NO_OPEN:
      return root.firstOpenedAt === null;
    case SEQUENCE_CONDITION.NO_CLICK:
      return root.clickCount === 0;
    default:
      return true;
  }
}

// --- Grupo de remitentes -----------------------------------------------------

/**
 * Remitentes que se reparten una campaña.
 *
 * Si no se ha elegido ninguno explícitamente, envía el remitente por defecto de
 * la campaña, que es el comportamiento esperado para un envío pequeño.
 */
export async function getCampaignSenders(campaignId: string): Promise<SenderWithUser[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      senders: { include: { sender: { include: { user: true } } } },
      sender: { include: { user: true } },
    },
  });
  if (!campaign) return [];

  const pool = campaign.senders.map((entry) => entry.sender).filter((sender) => sender.isActive);

  return pool.length > 0 ? pool : [campaign.sender];
}

export type PoolCapacity = {
  senders: Array<{
    id: string;
    fromEmail: string;
    label: string;
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

/** Capacidad conjunta de los remitentes de una campaña, para mostrarla antes de enviar. */
export async function getPoolCapacity(campaignId: string): Promise<PoolCapacity> {
  const senders = await getCampaignSenders(campaignId);
  const capacity = await getCapacity(senders);

  const rows = capacity.map((entry, index) => {
    const readiness = transportReadiness(senders[index]);
    return {
      id: entry.sender.id,
      fromEmail: entry.sender.fromEmail,
      label: entry.sender.label,
      transport: entry.sender.transport,
      used: entry.used,
      limit: entry.limit,
      remaining: readiness.ready ? entry.remaining : 0,
      ready: readiness.ready,
      reason: readiness.reason,
    };
  });

  return {
    senders: rows,
    totalRemaining: rows.reduce((total, entry) => total + entry.remaining, 0),
    totalLimit: rows.reduce((total, entry) => total + (entry.ready ? entry.limit : 0), 0),
  };
}

// --- Ritmo de envío ----------------------------------------------------------

/**
 * Cuántos correos caben en esta pasada sin superar el ritmo por hora de la
 * campaña. Enviar 2.000 correos en dos minutos es la forma más rápida de que el
 * proveedor limite las cuentas, aunque quede cuota de sobra.
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

/**
 * Aplica etiquetas de combinación, pie de baja y seguimiento a un mensaje.
 *
 * Un paso de secuencia sin asunto propio hereda el de la campaña con el prefijo
 * «Re:», que es lo que hace que el destinatario lo lea como continuación y no
 * como un correo nuevo.
 */
export function renderForContact(
  campaign: Pick<Campaign, "id" | "subject" | "html" | "trackOpens" | "trackClicks" | "includeUnsubscribe">,
  contact: Contact,
  trackingId: string,
  senderName: string,
  step?: Pick<SequenceStep, "subject" | "html"> | null,
  trackingBase?: string,
): RenderedEmail {
  const context = buildMergeContext(contact);

  const rawSubject = step
    ? step.subject.trim() || `Re: ${campaign.subject}`
    : campaign.subject;
  const rawHtml = step ? step.html : campaign.html;

  // El asunto es texto plano, así que no se escapa; el HTML sí, para que el
  // valor de un campo no pueda inyectar marcado.
  const subject = renderTemplate(rawSubject, context);
  const bodyHtml = renderTemplate(rawHtml, context, { escape: true });

  const html = prepareHtmlForSend({
    html: bodyHtml,
    trackingId,
    campaignId: campaign.id,
    unsubscribeToken: contact.unsubscribeToken,
    senderName,
    trackOpens: campaign.trackOpens,
    trackClicks: campaign.trackClicks,
    includeUnsubscribe: campaign.includeUnsubscribe,
    base: trackingBase,
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
  /** Cuántos correos ha puesto cada remitente en esta pasada. */
  perSender?: Record<string, number>;
};

/** Estado de un remitente durante una pasada. */
export type Slot = {
  capacity: SenderCapacity;
  sender: SenderWithUser;
  remaining: number;
  context: SendContext | null;
  disabled: boolean;
  sent: number;
};

type QueuedMessage = Recipient & {
  contact: Contact;
  step: SequenceStep | null;
  root: { id: string; gmailThreadId: string | null } | null;
};

/**
 * ¿Sigue esta campaña necesitando pasadas del worker?
 *
 * Una campaña marcada como enviada puede tener seguimientos pendientes días
 * después, así que el estado por sí solo no basta.
 */
async function shouldProcess(campaign: Campaign): Promise<boolean> {
  if (campaign.status === CAMPAIGN_STATUS.SENDING) return true;
  if (campaign.status !== CAMPAIGN_STATUS.SENT) return false;

  const pending = await prisma.recipient.count({
    where: { campaignId: campaign.id, status: RECIPIENT_STATUS.PENDING },
  });
  return pending > 0;
}

/**
 * Envía como mucho `batchSize` mensajes pendientes de una campaña, repartidos
 * entre sus remitentes.
 */
export async function processCampaign(campaignId: string, batchSize = env.cronBatchSize): Promise<ProcessResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

  if (!campaign) throw new Error("La campaña no existe.");
  if (!(await shouldProcess(campaign))) {
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "done", message: "La campaña no está enviando." };
  }

  const senders = await getCampaignSenders(campaignId);
  if (senders.length === 0) {
    await pause(campaignId, "La campaña no tiene ningún remitente disponible.");
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "auth" };
  }

  const capacities = await getCapacity(senders);

  // Sólo entran al reparto los remitentes listos para enviar y con cuota.
  const slots: Slot[] = [];
  const notReady: string[] = [];

  for (const [index, capacity] of capacities.entries()) {
    const sender = senders[index];
    const readiness = transportReadiness(sender);

    if (!readiness.ready) {
      notReady.push(readiness.reason ?? sender.fromEmail);
      continue;
    }
    if (capacity.remaining <= 0) continue;

    slots.push({ capacity, sender, remaining: capacity.remaining, context: null, disabled: false, sent: 0 });
  }

  if (slots.length === 0) {
    const message =
      notReady.length > 0
        ? notReady.join(" ")
        : "Todos los remitentes han agotado su cuota de las últimas 24 h. El envío se reanudará solo según se libere.";

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

  const pending = (await prisma.recipient.findMany({
    where: {
      campaignId,
      status: RECIPIENT_STATUS.PENDING,
      OR: [{ availableAt: null }, { availableAt: { lte: new Date() } }],
    },
    include: {
      contact: true,
      step: true,
      root: { select: { id: true, gmailThreadId: true } },
    },
    // Los envíos iniciales primero: un seguimiento nunca debe adelantar al
    // mensaje que lo origina.
    orderBy: [{ stepKey: "asc" }, { id: "asc" }],
    take: limit,
  })) as QueuedMessage[];

  if (pending.length === 0) {
    await finalizeIfComplete(campaignId);
    return { campaignId, processed: 0, sent: 0, failed: 0, stopped: "empty" };
  }

  // La base de los enlaces se resuelve una vez por lote, no por correo: es una
  // consulta a los ajustes y no cambia a mitad de pasada.
  const trackingBase = await getTrackingBaseUrl();

  let sent = 0;
  let failed = 0;
  let cursor = 0;

  try {
    for (const message of pending) {
      const contact = message.contact;

      // El contacto pudo darse de baja entre que se encoló y ahora.
      if (contact.status !== CONTACT_STATUS.SUBSCRIBED) {
        await prisma.recipient.update({
          where: { id: message.id },
          data: { status: RECIPIENT_STATUS.SKIPPED, error: "El contacto ya no está suscrito." },
        });
        continue;
      }

      const picked = pickSlot(slots, cursor, message.senderId);
      if (!picked) break; // todos los remitentes agotados o caídos en esta pasada
      cursor = picked.index + 1;

      const slot = picked.slot;
      const sender = slot.sender;

      // La conexión se abre en el primer correo de cada remitente y se reutiliza
      // para el resto del lote.
      if (!slot.context) {
        try {
          slot.context = await openTransport(sender);
        } catch (error) {
          slot.disabled = true;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { lastError: describeError(error) },
          });
          continue;
        }
      }

      const fromName = sender.fromName || campaign.fromName || sender.label;
      const replyTo = sender.replyTo || campaign.replyTo || null;
      const rendered = renderForContact(campaign, contact, message.trackingId, fromName, message.step, trackingBase);

      try {
        const result = await slot.context.send(
          {
            from: sender.fromEmail,
            fromName,
            to: contact.email,
            toName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyTo,
            messageId: messageIdFor(message.id),
            inReplyTo: message.rootId ? messageIdFor(message.rootId) : null,
            gmailThreadId: message.root?.gmailThreadId ?? null,
            listUnsubscribeUrl: campaign.includeUnsubscribe
              ? oneClickUnsubscribeUrl(contact.unsubscribeToken, campaign.id, trackingBase)
              : null,
          },
          // Clave estable por mensaje: si un fallo de red obliga a reintentar,
          // Resend lo reconoce y no lo duplica.
          message.id,
        );

        await prisma.$transaction([
          prisma.recipient.update({
            where: { id: message.id },
            data: {
              status: RECIPIENT_STATUS.SENT,
              sentAt: new Date(),
              senderId: sender.id,
              gmailMessageId: result.messageId || null,
              gmailThreadId: result.threadId || message.root?.gmailThreadId || null,
              attempts: { increment: 1 },
              error: null,
            },
          }),
          prisma.contact.update({ where: { id: contact.id }, data: { lastSentAt: new Date() } }),
          prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: { increment: 1 } } }),
          prisma.event.create({
            data: { type: EVENT_TYPE.SENT, campaignId, contactId: contact.id, recipientId: message.id },
          }),
        ]);

        await recordSend(quotaKeyFor(sender));
        slot.remaining -= 1;
        slot.sent += 1;
        sent += 1;
      } catch (error) {
        // Cada proveedor devuelve los errores a su manera; la cola necesita la
        // misma respuesta a la misma pregunta: ¿merece la pena reintentar?
        const classified = error instanceof ResendError ? classifyResendError(error) : classifyGmailError(error);
        const attempts = message.attempts + 1;
        const giveUp = !classified.retryable || attempts >= MAX_ATTEMPTS;

        await prisma.recipient.update({
          where: { id: message.id },
          data: {
            status: giveUp ? RECIPIENT_STATUS.FAILED : RECIPIENT_STATUS.PENDING,
            attempts,
            error: `[${sender.fromEmail}] ${classified.message}`,
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
                recipientId: message.id,
                meta: classified.message,
              },
            }),
          ]);
        }

        // Si el proveedor limita o revoca **este** remitente, se aparta y el
        // lote sigue con los demás: con varios remitentes, que uno se caiga no
        // debe detener la campaña entera.
        if (classified.status === 429 || classified.status === 403 || classified.status === 401) {
          slot.disabled = true;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { lastError: `[${sender.fromEmail}] ${classified.message}` },
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

  if (slots.every((slot) => slot.disabled) && sent === 0) {
    await pause(campaignId, "Todos los remitentes han fallado. Revisa sus credenciales en Remitentes.");
    return { campaignId, processed: pending.length, sent, failed, stopped: "auth" };
  }

  await finalizeIfComplete(campaignId);

  return {
    campaignId,
    processed: pending.length,
    sent,
    failed,
    perSender: Object.fromEntries(
      slots.filter((slot) => slot.sent > 0).map((slot) => [slot.sender.fromEmail, slot.sent]),
    ),
  };
}

/**
 * Elige el remitente del siguiente mensaje.
 *
 * `preferred` es el remitente que ya tenía asignado el mensaje: los
 * seguimientos lo heredan del envío original para no cambiar de dirección a
 * mitad de conversación. Si ese remitente no está disponible ahora mismo, se
 * pasa al turno rotatorio antes que dejar el mensaje sin enviar.
 *
 * El reparto es circular para que todos los remitentes envíen a un ritmo
 * parecido: concentrar los envíos en uno y pasar al siguiente al agotarlo haría
 * que el dominio muestre un patrón mucho menos natural.
 */
export function pickSlot(
  slots: Slot[],
  cursor: number,
  preferredSenderId?: string | null,
): { slot: Slot; index: number } | null {
  if (preferredSenderId) {
    const index = slots.findIndex(
      (slot) => slot.sender.id === preferredSenderId && !slot.disabled && slot.remaining > 0,
    );
    if (index !== -1) return { slot: slots[index], index };
  }

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

/**
 * Marca la campaña como enviada cuando no queda nada pendiente.
 *
 * Los seguimientos futuros no lo impiden: una campaña con una secuencia de dos
 * semanas se da por enviada en cuanto sale el mensaje inicial, y el worker la
 * sigue procesando después según se vayan encolando los pasos.
 */
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
  followUps: FollowUpResult[];
  processed: ProcessResult[];
};

/**
 * Una pasada del worker: activa las campañas programadas cuya hora ya llegó,
 * encola los seguimientos que tocan y procesa un lote de cada campaña con
 * mensajes pendientes.
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

  // Los seguimientos se encolan antes de procesar, para que entren en esta
  // misma pasada si les toca.
  let followUps: FollowUpResult[] = [];
  try {
    followUps = (await scheduleFollowUps()).filter((entry) => entry.created > 0);
  } catch (error) {
    console.error("[worker] al encolar seguimientos:", describeError(error));
  }

  // Se procesan tanto las campañas en curso como las ya enviadas que tengan
  // seguimientos pendientes.
  const candidates = await prisma.campaign.findMany({
    where: {
      OR: [
        { status: CAMPAIGN_STATUS.SENDING },
        { status: CAMPAIGN_STATUS.SENT, recipients: { some: { status: RECIPIENT_STATUS.PENDING } } },
      ],
    },
    select: { id: true },
    orderBy: { startedAt: "asc" },
  });

  const processed: ProcessResult[] = [];
  for (const campaign of candidates) {
    try {
      processed.push(await processCampaign(campaign.id, batchSize));
    } catch (error) {
      const message = describeError(error);
      console.error(`[worker] campaña ${campaign.id}:`, message);
      await prisma.campaign.update({ where: { id: campaign.id }, data: { lastError: message } });
      processed.push({ campaignId: campaign.id, processed: 0, sent: 0, failed: 0, message });
    }
  }

  return { activated, followUps, processed };
}

// --- Envío de prueba ---------------------------------------------------------

/** Manda una previsualización a una dirección concreta, sin tocar la cola. */
export async function sendTestEmail(
  campaign: Campaign & { sender: Sender & { user: User | null } },
  toEmail: string,
  sampleContact: Contact | null,
  step?: SequenceStep | null,
): Promise<void> {
  const sender = campaign.sender;
  const context = await openTransport(sender);
  const fromName = sender.fromName || campaign.fromName || sender.label;

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

  const mergeContext = buildMergeContext(contact);
  const rawSubject = step ? step.subject.trim() || `Re: ${campaign.subject}` : campaign.subject;
  const subject = `[PRUEBA] ${renderTemplate(rawSubject, mergeContext)}`;
  const html = renderTemplate(step ? step.html : campaign.html, mergeContext, { escape: true });

  try {
    await context.send({
      from: sender.fromEmail,
      fromName,
      to: toEmail,
      subject,
      // En la prueba no se inyecta píxel ni se reescriben enlaces: no queremos
      // que un envío de prueba contamine las estadísticas de la campaña.
      html,
      text: htmlToPlainText(html),
      replyTo: sender.replyTo || campaign.replyTo || null,
    });
  } finally {
    await context.close();
  }

  // La prueba también consume cuota del proveedor, así que se contabiliza.
  await recordSend(quotaKeyFor(sender));
}

export { GoogleAuthError };
export { getRemainingQuota, getSentInWindow } from "./quota";
