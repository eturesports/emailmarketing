import { Prisma, type Lead, type LeadSource } from "@prisma/client";
import { prisma } from "./db";
import {
  CAMPAIGN_KIND,
  CAMPAIGN_STATUS,
  CONTACT_STATUS,
  IMPORT_FIELD_ALIASES,
  LEAD_PROVIDER,
  LEAD_STATUS,
} from "./constants";
import { MetaApiError, fetchMetaLead, flattenFieldData } from "./meta";
import { playbookFor } from "./lead-playbooks";
import { normalizeKey, parseCustomFields } from "./merge";
import { VERIFICATION, verifyEmail } from "./verify";
import { isValidEmail, normalizeEmail } from "./utils";

/**
 * Entrada de leads: de un formulario de Meta (o de cualquier integración que
 * llame a /api/leads) a un contacto dentro de su lista y de su automatización.
 *
 *   webhook ─▶ recordLead ─▶ processLead ─▶ contacto + lista + cola de la
 *                                            automatización de su origen
 *
 * Cada lead queda registrado antes de procesarse. Si algo falla por el camino
 * (Meta no responde, el token caducó…), el lead sigue ahí y el worker lo
 * reintenta: un lead de pago no se puede perder por un error de red.
 */

/** Reintentos antes de dar un lead por fallido. Con el cron cada 5 min, unas 2 h. */
const MAX_LEAD_ATTEMPTS = 24;

/** Un lead recién llegado no lo reintenta el worker: aún lo está procesando el webhook. */
const RETRY_GRACE_MS = 2 * 60_000;

// --- Orígenes ----------------------------------------------------------------

export function parseFormIds(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Acepta IDs separados por comas, espacios o saltos de línea; sin duplicados. */
export function normalizeFormIds(values: string[] | string): string[] {
  const list = Array.isArray(values) ? values : values.split(/[\s,;]+/);
  return [...new Set(list.map((value) => value.trim()).filter((value) => /^\d{5,30}$/.test(value)))];
}

function findSourceForForm(sources: LeadSource[], formId: string | null): LeadSource | null {
  if (!formId) return null;
  return sources.find((source) => parseFormIds(source.metaFormIds).includes(formId)) ?? null;
}

// --- Datos del formulario ----------------------------------------------------

export type LeadPerson = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  /** Todo lo demás que preguntaba el formulario (edad, posición, equipo…). */
  custom: Record<string, string>;
};

/** Claves que Meta usa en sus preguntas estándar, más las de un formulario en español. */
const KEY_ALIASES: Record<"email" | "fullName" | "firstName" | "lastName" | "phone" | "country", string[]> = {
  email: [...IMPORT_FIELD_ALIASES.email, "work_email", "correo_electronico"],
  fullName: ["full_name", "fullname", "nombre_completo", "nombre y apellidos", "name"],
  firstName: ["first_name", "firstname", "nombre"],
  lastName: ["last_name", "lastname", ...IMPORT_FIELD_ALIASES.lastName],
  phone: ["phone_number", "work_phone_number", ...IMPORT_FIELD_ALIASES.phone],
  country: IMPORT_FIELD_ALIASES.country,
};

const ALIAS_INDEX = new Map<string, keyof typeof KEY_ALIASES>();
for (const [field, aliases] of Object.entries(KEY_ALIASES) as Array<[keyof typeof KEY_ALIASES, string[]]>) {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (!ALIAS_INDEX.has(key)) ALIAS_INDEX.set(key, field);
  }
}

/** Partículas que van en minúscula al capitalizar un nombre. */
const NAME_PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "i", "da", "do", "dos", "van", "von"]);

/**
 * Deja un nombre listo para saludar con él, o null si no es fiable.
 *
 * El nombre de un lead de Meta sale del perfil de Facebook o Instagram, y ahí
 * hay de todo: «JUAN», «juan perez», «Juan 🔥», «Mamá de Lucas 10»… Un saludo
 * con un nombre raro queda peor que uno genérico, así que ante la duda se
 * descarta y la plantilla usa su valor por defecto (`{{firstName | family}}`).
 */
export function cleanPersonName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/[\d@_/\\]|https?:/i.test(raw)) return null;

  let value = raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\s'’.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (value.length < 2 || value.length > 60) return null;

  // Sólo se recapitaliza lo que viene todo en mayúsculas o todo en minúsculas:
  // «McDonald» o «DiMaría» se respetan tal y como los escribió la persona.
  if (value === value.toUpperCase() || value === value.toLowerCase()) {
    value = value
      .toLowerCase()
      .split(" ")
      .map((word, index) =>
        index > 0 && NAME_PARTICLES.has(word)
          ? word
          : word.replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, letter: string) => sep + letter.toUpperCase()),
      )
      .join(" ");
  }

  return value;
}

/**
 * Palabras que delatan que el «nombre» del perfil no es el de la persona: «Soccer
 * Mom», «Jake's Dad», «Familia García», «Eture FC»… Si aparece alguna, no se
 * saluda por el nombre: es mejor «Hola family» que «Hola Soccer».
 */
const NOT_A_NAME = new Set([
  "mom", "mommy", "mother", "dad", "daddy", "father", "parent", "parents", "family", "familia",
  "mama", "mamá", "papa", "papá", "madre", "padre", "hijo", "hija",
  "soccer", "futbol", "fútbol", "football", "fc", "club", "team", "academy", "official", "oficial",
  "admin", "test", "prueba", "user", "usuario", "unknown", "na", "n.a", "none", "no",
]);

/**
 * Nombre con el que saludar, o null si no hay uno claro.
 *
 * Más exigente que `cleanPersonName`, porque el saludo es lo primero que se lee:
 * una inicial suelta («J.»), un apodo de perfil («Soccer Mom») o una sola letra
 * dan un «Hola J.,» peor que el «Hola family,» de la plantilla.
 */
export function greetingName(firstName: string | null, fullName?: string | null): string | null {
  if (!firstName) return null;

  const words = `${firstName} ${fullName ?? ""}`
    .toLowerCase()
    .split(/[\s'’-]+/)
    .map((word) => word.replace(/\.$/, ""))
    .filter(Boolean);
  if (words.some((word) => NOT_A_NAME.has(word))) return null;

  // Cada palabra del nombre de pila tiene que ser algo más que una inicial.
  const parts = firstName.split(" ").filter(Boolean);
  if (parts.some((part) => part.replace(/\./g, "").length < 2)) return null;

  return firstName;
}

/**
 * Separa «nombre apellidos». Con cuatro palabras o más se asume nombre
 * compuesto («María José García López» → «María José»), que es lo habitual en
 * España; con menos, la primera palabra es el nombre.
 */
export function splitFullName(full: string): { firstName: string; lastName: string | null } {
  const words = full.split(" ").filter(Boolean);
  const take = words.length >= 4 && !NAME_PARTICLES.has(words[1].toLowerCase()) ? 2 : 1;
  return {
    firstName: words.slice(0, take).join(" "),
    lastName: words.slice(take).join(" ") || null,
  };
}

/** Convierte las respuestas de un formulario en los datos de un contacto. */
export function personFromFields(fields: Record<string, string>): LeadPerson {
  const known: Partial<Record<keyof typeof KEY_ALIASES, string>> = {};
  const custom: Record<string, string> = {};

  for (const [rawKey, value] of Object.entries(fields)) {
    const field = ALIAS_INDEX.get(normalizeKey(rawKey));
    if (field && !known[field]) {
      known[field] = value;
      continue;
    }
    // Las preguntas personalizadas de Meta llegan con claves tipo
    // «¿qué_edad_tiene_tu_hijo/a?»: se limpian para poder usarlas como
    // etiqueta ({{quéedadtienetuhijoa}} no, pero {{que_edad_tiene_tu_hijo_a}} sí).
    const key = rawKey
      .replace(/[¿?¡!:]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
    if (key) custom[key] = value.slice(0, 500);
  }

  const email = known.email ? normalizeEmail(known.email) : null;

  let firstName = cleanPersonName(known.firstName);
  let lastName = cleanPersonName(known.lastName);
  if (!firstName && known.fullName) {
    const full = cleanPersonName(known.fullName);
    if (full) {
      const split = splitFullName(full);
      firstName = split.firstName;
      lastName = lastName ?? split.lastName;
    }
  }

  // Sin un nombre claro no se guarda nombre de pila: la plantilla saluda con su
  // comodín («Hola family») y el panel no muestra un nombre engañoso.
  if (!greetingName(firstName, known.fullName ?? known.lastName)) {
    firstName = null;
  }

  return {
    email: email && isValidEmail(email) ? email : null,
    firstName,
    lastName,
    phone: known.phone?.trim().slice(0, 40) || null,
    country: known.country?.trim().slice(0, 60) || null,
    custom,
  };
}

// --- Registro ----------------------------------------------------------------

export type LeadInput = {
  provider: (typeof LEAD_PROVIDER)[keyof typeof LEAD_PROVIDER];
  externalId: string;
  formId?: string | null;
  pageId?: string | null;
  adId?: string | null;
  adName?: string | null;
  campaignName?: string | null;
  /** Respuestas ya conocidas. En Meta llegan vacías y se piden a la Graph API. */
  fields?: Record<string, string>;
  /** Origen ya decidido (el endpoint genérico lo recibe explícitamente). */
  sourceId?: string | null;
};

/**
 * Guarda un lead recibido. Idempotente por `externalId`: Meta reintenta las
 * notificaciones que no recibieron un 200 a tiempo, y el mismo lead no debe
 * entrar dos veces.
 */
export async function recordLead(input: LeadInput): Promise<{ lead: Lead; created: boolean }> {
  const existing = await prisma.lead.findUnique({ where: { externalId: input.externalId } });
  if (existing) return { lead: existing, created: false };

  try {
    const lead = await prisma.lead.create({
      data: {
        provider: input.provider,
        externalId: input.externalId,
        formId: input.formId ?? null,
        pageId: input.pageId ?? null,
        adId: input.adId ?? null,
        adName: input.adName ?? null,
        campaignName: input.campaignName ?? null,
        fields: JSON.stringify(input.fields ?? {}),
        sourceId: input.sourceId ?? null,
      },
    });
    return { lead, created: true };
  } catch (error) {
    // Dos notificaciones del mismo lead a la vez: la segunda pierde la carrera.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { externalId: input.externalId } });
      return { lead, created: false };
    }
    throw error;
  }
}

// --- Procesado ---------------------------------------------------------------

export type ProcessLeadResult = {
  leadId: string;
  status: string;
  outcome: string | null;
  /** Automatización activa en la que ha entrado, para enviar ya la bienvenida. */
  enrolledCampaignId?: string;
};

/** Procesa un lead: datos, contacto, lista y automatización. Nunca lanza. */
export async function processLead(leadId: string): Promise<ProcessLeadResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { leadId, status: "MISSING", outcome: null };
  if (lead.status === LEAD_STATUS.PROCESSED || lead.status === LEAD_STATUS.INVALID) {
    return { leadId, status: lead.status, outcome: lead.outcome };
  }

  try {
    return await processLeadUnsafe(lead);
  } catch (error) {
    const retryable = !(error instanceof MetaApiError) || error.retryable;
    const attempts = lead.attempts + 1;
    const status = retryable && attempts < MAX_LEAD_ATTEMPTS ? LEAD_STATUS.PENDING : LEAD_STATUS.FAILED;
    const message = error instanceof Error ? error.message : String(error);

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status, attempts, error: message.slice(0, 500) },
    });
    return { leadId, status, outcome: message };
  }
}

async function finish(
  lead: Lead,
  status: string,
  outcome: string,
  extra: Prisma.LeadUncheckedUpdateInput = {},
): Promise<ProcessLeadResult> {
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status,
      outcome,
      error: null,
      attempts: lead.attempts + 1,
      processedAt: status === LEAD_STATUS.PROCESSED || status === LEAD_STATUS.INVALID ? new Date() : null,
      ...extra,
    },
  });
  return { leadId: lead.id, status, outcome };
}

async function processLeadUnsafe(lead: Lead): Promise<ProcessLeadResult> {
  // 1. Respuestas del formulario. Meta sólo avisa del identificador.
  let fields = parseCustomFields(lead.fields);
  if (Object.keys(fields).length === 0 && lead.provider === LEAD_PROVIDER.META) {
    const remote = await fetchMetaLead(lead.externalId);
    fields = flattenFieldData(remote.field_data);
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        fields: JSON.stringify(fields),
        formId: lead.formId ?? remote.form_id ?? null,
        adId: lead.adId ?? remote.ad_id ?? null,
        adName: remote.ad_name ?? lead.adName,
        campaignName: remote.campaign_name ?? lead.campaignName,
      },
    });
  }

  // 2. Origen: padres, jugadores… según el formulario del que viene.
  const sources = await prisma.leadSource.findMany();
  const source = lead.sourceId
    ? (sources.find((entry) => entry.id === lead.sourceId) ?? null)
    : findSourceForForm(sources, lead.formId);

  if (!source) {
    return finish(
      lead,
      LEAD_STATUS.UNMATCHED,
      lead.formId
        ? `El formulario ${lead.formId} no está asignado a ningún origen.`
        : "No se sabe de qué formulario viene.",
    );
  }

  // 3. Persona.
  const person = personFromFields(fields);
  if (!person.email) {
    return finish(lead, LEAD_STATUS.INVALID, "El formulario no trae un email válido.", { sourceId: source.id });
  }

  const contact = await upsertContactFromLead(lead, source, { ...person, email: person.email });

  // 4. Lista del origen.
  if (source.listId) {
    await prisma.listMembership.upsert({
      where: { listId_contactId: { listId: source.listId, contactId: contact.id } },
      create: { listId: source.listId, contactId: contact.id },
      update: {},
    });
  }

  const base = { sourceId: source.id, contactId: contact.id };

  // 5. Automatización del origen.
  if (!source.isActive) {
    return finish(lead, LEAD_STATUS.PROCESSED, "Contacto guardado. El origen está desactivado: no se envía nada.", base);
  }
  if (!source.campaignId) {
    return finish(lead, LEAD_STATUS.PROCESSED, "Contacto guardado. El origen no tiene automatización asignada.", base);
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: source.campaignId } });
  if (!campaign || campaign.kind !== CAMPAIGN_KIND.AUTOMATION) {
    return finish(lead, LEAD_STATUS.PROCESSED, "Contacto guardado. La campaña asignada no es una automatización.", base);
  }

  if (contact.status !== CONTACT_STATUS.SUBSCRIBED) {
    return finish(lead, LEAD_STATUS.PROCESSED, "Contacto guardado. Estaba dado de baja o rebotado: no se le envía nada.", base);
  }
  if (contact.verification === VERIFICATION.INVALID) {
    return finish(
      lead,
      LEAD_STATUS.PROCESSED,
      `Contacto guardado sin enviar: la dirección no es válida (${contact.verificationReason ?? "no acepta correo"}).`,
      base,
    );
  }

  const enrolled = await enroll(campaign.id, contact.id);
  if (!enrolled) {
    return finish(lead, LEAD_STATUS.PROCESSED, `Ya había entrado antes en «${campaign.name}»: no se repite.`, base);
  }

  const active = campaign.status === CAMPAIGN_STATUS.SENDING;
  const result = await finish(
    lead,
    LEAD_STATUS.PROCESSED,
    active
      ? `En «${campaign.name}».`
      : `En cola de «${campaign.name}», que no está activa: saldrá cuando se active.`,
    base,
  );

  return active ? { ...result, enrolledCampaignId: campaign.id } : result;
}

/**
 * Crea el contacto o completa el que ya existía.
 *
 * Con un contacto existente sólo se rellenan los huecos: el nombre que alguien
 * corrigió a mano en el panel manda sobre el del perfil de Facebook. Nunca se
 * toca su estado: un lead nuevo no anula una baja anterior.
 */
async function upsertContactFromLead(lead: Lead, source: LeadSource, person: LeadPerson & { email: string }) {
  const existing = await prisma.contact.findUnique({ where: { email: person.email } });

  const custom = {
    ...parseCustomFields(existing?.customFields),
    ...person.custom,
    origenLead: source.name,
    ...(lead.formId ? { formularioMeta: lead.formId } : {}),
    ...(lead.adName ? { anuncioMeta: lead.adName } : {}),
    ...(lead.campaignName ? { campanaMeta: lead.campaignName } : {}),
  };

  const needsVerification = !existing || existing.verification === VERIFICATION.UNKNOWN;
  const verification = needsVerification ? await verifyEmail(person.email) : null;
  const verificationData = verification
    ? { verification: verification.verification, verificationReason: verification.reason, verifiedAt: new Date() }
    : {};

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName || person.firstName,
        lastName: existing.lastName || person.lastName,
        phone: existing.phone || person.phone,
        country: existing.country || person.country,
        customFields: JSON.stringify(custom),
        ...verificationData,
      },
    });
  }

  const data = {
    email: person.email,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: person.phone,
    country: person.country,
    customFields: JSON.stringify(custom),
    source: lead.provider === LEAD_PROVIDER.META ? "meta" : "api",
    ...verificationData,
  };

  try {
    return await prisma.contact.create({ data });
  } catch (error) {
    // Dos leads con el mismo email a la vez (el mismo formulario enviado dos
    // veces seguidas): el segundo se queda con el contacto del primero.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.contact.findUniqueOrThrow({ where: { email: person.email } });
    }
    throw error;
  }
}

/**
 * Mete un contacto en una automatización. Devuelve false si ya estaba: quien
 * rellena el formulario dos veces no debe recibir dos bienvenidas.
 */
async function enroll(campaignId: string, contactId: string): Promise<boolean> {
  const already = await prisma.recipient.findUnique({
    where: { campaignId_contactId_stepKey: { campaignId, contactId, stepKey: "initial" } },
  });
  if (already) return false;

  try {
    await prisma.$transaction([
      prisma.recipient.create({ data: { campaignId, contactId, stepKey: "initial" } }),
      prisma.campaign.update({ where: { id: campaignId }, data: { totalRecipients: { increment: 1 } } }),
    ]);
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

// --- Reintentos y reasignación ----------------------------------------------

/**
 * Reintenta los leads que se quedaron a medias. Lo llama el worker en cada
 * pasada, antes de vaciar la cola, para que la bienvenida salga en esa misma.
 */
export async function retryPendingLeads(limit = 50): Promise<ProcessLeadResult[]> {
  const leads = await prisma.lead.findMany({
    where: { status: LEAD_STATUS.PENDING, receivedAt: { lt: new Date(Date.now() - RETRY_GRACE_MS) } },
    orderBy: { receivedAt: "asc" },
    select: { id: true },
    take: limit,
  });

  const results: ProcessLeadResult[] = [];
  for (const lead of leads) results.push(await processLead(lead.id));
  return results;
}

/**
 * Asigna un formulario a un origen y procesa los leads que esperaban por él.
 *
 * Es el flujo natural al lanzar un anuncio nuevo: llega el primer lead, aparece
 * como «sin asignar» con su ID de formulario, y desde el panel se le dice si es
 * de padres o de jugadores. Los que llegaron antes no se pierden.
 */
export async function assignFormToSource(formId: string, sourceId: string): Promise<ProcessLeadResult[]> {
  const sources = await prisma.leadSource.findMany();
  const target = sources.find((source) => source.id === sourceId);
  if (!target) throw new Error("El origen no existe.");

  // Un formulario pertenece a un único origen.
  for (const source of sources) {
    const ids = parseFormIds(source.metaFormIds);
    const next = source.id === sourceId ? normalizeFormIds([...ids, formId]) : ids.filter((id) => id !== formId);
    if (next.join() !== ids.join()) {
      await prisma.leadSource.update({ where: { id: source.id }, data: { metaFormIds: JSON.stringify(next) } });
    }
  }

  return reprocessUnmatched(formId);
}

/** Vuelve a procesar los leads sin asignar de un formulario (o de todos). */
export async function reprocessUnmatched(formId?: string): Promise<ProcessLeadResult[]> {
  const leads = await prisma.lead.findMany({
    where: { status: LEAD_STATUS.UNMATCHED, ...(formId ? { formId } : {}) },
    select: { id: true },
    take: 500,
  });

  await prisma.lead.updateMany({
    where: { id: { in: leads.map((lead) => lead.id) } },
    data: { status: LEAD_STATUS.PENDING },
  });

  const results: ProcessLeadResult[] = [];
  for (const lead of leads) results.push(await processLead(lead.id));
  return results;
}

/** Devuelve un lead fallido a la cola y lo procesa de nuevo. */
export async function retryLead(leadId: string): Promise<ProcessLeadResult> {
  await prisma.lead.updateMany({
    where: { id: leadId, status: { in: [LEAD_STATUS.FAILED, LEAD_STATUS.UNMATCHED, LEAD_STATUS.PENDING] } },
    data: { status: LEAD_STATUS.PENDING, attempts: 0 },
  });
  return processLead(leadId);
}

// --- Automatización de partida ----------------------------------------------

/**
 * Crea la automatización de un origen a partir de su contenido de partida (ver
 * lib/lead-playbooks.ts): bienvenida y dos seguimientos, lista propia y el
 * origen ya enlazado. Queda en borrador para revisarla antes de activarla.
 */
export async function createAutomationForSource(sourceId: string, userId: string | null) {
  const source = await prisma.leadSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("El origen no existe.");

  const playbook = playbookFor(source.audience);
  if (!playbook) throw new Error("Este origen no tiene contenido de partida: elige padres o jugadores como público.");

  const sender =
    (userId
      ? await prisma.sender.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "asc" } })
      : null) ?? (await prisma.sender.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));
  if (!sender) throw new Error("No hay ningún remitente configurado. Crea uno en Remitentes.");

  const listId =
    source.listId ??
    (
      await prisma.contactList.upsert({
        where: { name: playbook.listName },
        create: {
          name: playbook.listName,
          color: playbook.listColor,
          description: `Leads de Meta Ads del origen «${source.name}».`,
        },
        update: {},
      })
    ).id;

  const campaign = await prisma.campaign.create({
    data: {
      name: playbook.campaignName,
      kind: CAMPAIGN_KIND.AUTOMATION,
      subject: playbook.subject,
      previewText: playbook.previewText,
      html: playbook.html,
      senderId: sender.id,
      createdById: userId,
      fromName: sender.fromName,
      replyTo: sender.replyTo,
      sendRatePerHour: sender.sendRatePerHour,
      status: CAMPAIGN_STATUS.DRAFT,
      steps: {
        create: playbook.steps.map((step, index) => ({
          position: index + 1,
          delayHours: step.delayHours,
          condition: step.condition,
          subject: step.subject,
          html: step.html,
        })),
      },
    },
  });

  await prisma.leadSource.update({ where: { id: source.id }, data: { campaignId: campaign.id, listId } });
  return campaign;
}
