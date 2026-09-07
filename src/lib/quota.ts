import type { Sender } from "@prisma/client";
import { prisma } from "./db";
import { QUOTA_WINDOW_HOURS, TRANSPORT } from "./constants";
import { transportLimit, transportOf } from "./transport";
import { getResendDailyLimit } from "./settings";

/**
 * Contabilidad de cuota.
 *
 * Dos ideas sostienen este módulo:
 *
 * 1. **Ventana móvil de 24 horas.** Los proveedores no liberan cuota a
 *    medianoche: quien envía 2.000 correos a las 23:00 no recupera capacidad
 *    hasta las 23:00 del día siguiente. Por eso el consumo se guarda en cubos
 *    de una hora (UTC) y la cuota disponible suma los últimos 24.
 *
 * 2. **El sujeto de la cuota no es el remitente.** Dos alias de la misma cuenta
 *    de Google son dos remitentes distintos, pero comparten un único límite de
 *    2.000 mensajes; y todos los remitentes de Resend comparten el plan del
 *    equipo. Contar por remitente daría por buena una capacidad que no existe,
 *    y la campaña chocaría con el proveedor a mitad de envío.
 *
 * La granularidad horaria hace que en la hora en curso se cuente de más (nunca
 * de menos), lo que deja el cálculo del lado conservador.
 */

/** Cubo horario en UTC: `YYYY-MM-DDTHH`. */
export function hourBucket(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

/** Los cubos que caen dentro de la ventana móvil, del más reciente al más antiguo. */
export function windowBuckets(now = new Date()): string[] {
  const buckets: string[] = [];
  for (let offset = 0; offset < QUOTA_WINDOW_HOURS; offset += 1) {
    buckets.push(hourBucket(new Date(now.getTime() - offset * 3_600_000)));
  }
  return buckets;
}

/**
 * Contra qué límite consume este remitente.
 *
 *   - GMAIL_API  → la cuenta de Google: su límite de 2.000 es de la cuenta, no
 *                  de la dirección, así que todos sus alias comparten cubo.
 *   - SMTP_RELAY → la cuenta que se autentica en el relay, que puede no ser la
 *                  misma que autorizó OAuth.
 *   - RESEND     → uno solo para toda la instalación: el plan es del equipo.
 */
export function quotaKeyFor(sender: Pick<Sender, "transport" | "userId" | "smtpUser" | "fromEmail">): string {
  switch (transportOf(sender)) {
    case TRANSPORT.RESEND:
      return "resend";
    case TRANSPORT.SMTP_RELAY:
      return `smtp:${(sender.smtpUser ?? sender.fromEmail).toLowerCase()}`;
    default:
      return `google:${sender.userId ?? sender.fromEmail.toLowerCase()}`;
  }
}

/** Correos enviados contra una clave de cuota en las últimas 24 horas. */
export async function getSentInWindow(quotaKey: string): Promise<number> {
  const result = await prisma.sendLog.aggregate({
    where: { quotaKey, hour: { in: windowBuckets() } },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}

/** Igual que `getSentInWindow`, pero para varias claves de una sola consulta. */
export async function getSentInWindowFor(quotaKeys: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(quotaKeys)];
  if (unique.length === 0) return new Map();

  const rows = await prisma.sendLog.groupBy({
    by: ["quotaKey"],
    where: { quotaKey: { in: unique }, hour: { in: windowBuckets() } },
    _sum: { count: true },
  });

  const totals = new Map<string, number>(unique.map((key) => [key, 0]));
  for (const row of rows) totals.set(row.quotaKey, row._sum.count ?? 0);
  return totals;
}

/**
 * Techo efectivo de un remitente: el menor entre lo que permite el proveedor
 * para su transporte y el tope propio configurado.
 *
 * `resendLimit` es el plan contratado, que vive en los ajustes de la
 * organización. Se pasa como parámetro para que esta función siga siendo
 * síncrona y poder usarla al pintar; `resolveLimit` es la versión que lo lee.
 */
export function effectiveLimit(sender: Pick<Sender, "transport" | "dailyQuota">, resendLimit?: number): number {
  const ceiling =
    transportOf(sender) === TRANSPORT.RESEND && resendLimit !== undefined ? resendLimit : transportLimit(sender);
  return Math.min(ceiling, sender.dailyQuota);
}

/** Igual que `effectiveLimit`, leyendo el tope de Resend de los ajustes. */
export async function resolveLimit(sender: Pick<Sender, "transport" | "dailyQuota">): Promise<number> {
  if (transportOf(sender) !== TRANSPORT.RESEND) return effectiveLimit(sender);
  return effectiveLimit(sender, await getResendDailyLimit());
}

/** Envíos que le quedan a un remitente en la ventana actual. */
export async function getRemainingQuota(sender: Sender): Promise<number> {
  const [limit, used] = await Promise.all([resolveLimit(sender), getSentInWindow(quotaKeyFor(sender))]);
  return Math.max(0, limit - used);
}

/** Anota un envío en el cubo horario correspondiente. */
export async function recordSend(quotaKey: string, count = 1): Promise<void> {
  const hour = hourBucket();
  await prisma.sendLog.upsert({
    where: { quotaKey_hour: { quotaKey, hour } },
    create: { quotaKey, hour, count },
    update: { count: { increment: count } },
  });
}

/** Borra cubos fuera de la ventana; el worker lo llama de vez en cuando. */
export async function pruneOldBuckets(): Promise<number> {
  // Se conservan unos días de margen para poder mirar el histórico reciente.
  const cutoff = hourBucket(new Date(Date.now() - 7 * 24 * 3_600_000));
  const { count } = await prisma.sendLog.deleteMany({ where: { hour: { lt: cutoff } } });
  return count;
}

export type SenderCapacity = {
  sender: Sender;
  quotaKey: string;
  used: number;
  limit: number;
  remaining: number;
};

/**
 * Capacidad restante de un conjunto de remitentes.
 *
 * Cuando varios comparten clave de cuota (dos alias de la misma cuenta de
 * Google, por ejemplo), el hueco disponible se **reparte** entre ellos en lugar
 * de contarse entero para cada uno: sumar sus «remaining» anunciaría el doble
 * de capacidad de la que existe.
 */
export async function getCapacity(senders: Sender[]): Promise<SenderCapacity[]> {
  const keys = senders.map(quotaKeyFor);
  const used = await getSentInWindowFor(keys);

  // El tope de Resend se lee una sola vez, y sólo si alguien lo usa.
  const needsResend = senders.some((sender) => transportOf(sender) === TRANSPORT.RESEND);
  const resendLimit = needsResend ? await getResendDailyLimit() : undefined;

  const sharing = new Map<string, number>();
  for (const key of keys) sharing.set(key, (sharing.get(key) ?? 0) + 1);

  return senders.map((sender, index) => {
    const quotaKey = keys[index];
    const limit = effectiveLimit(sender, resendLimit);
    const consumed = used.get(quotaKey) ?? 0;
    const shares = sharing.get(quotaKey) ?? 1;

    return {
      sender,
      quotaKey,
      used: consumed,
      limit,
      remaining: Math.max(0, Math.floor((limit - consumed) / shares)),
    };
  });
}

/**
 * Totales de un conjunto de remitentes, **sin contar dos veces** la cuota
 * compartida.
 *
 * Sumar los campos de cada remitente daría cifras infladas cuando varios
 * comparten límite: dos alias de la misma cuenta de Google anunciarían 4.000
 * correos donde sólo hay 2.000. Aquí se agrupa por clave de cuota y cada una
 * aporta una sola vez.
 */
export function aggregateCapacity(capacities: SenderCapacity[]): {
  used: number;
  limit: number;
  remaining: number;
} {
  const seen = new Map<string, { used: number; limit: number }>();

  for (const entry of capacities) {
    // Si dos remitentes comparten clave con topes propios distintos, manda el
    // menor: es el que de verdad va a frenar los envíos.
    const previous = seen.get(entry.quotaKey);
    seen.set(entry.quotaKey, {
      used: entry.used,
      limit: previous ? Math.min(previous.limit, entry.limit) : entry.limit,
    });
  }

  let used = 0;
  let limit = 0;
  for (const entry of seen.values()) {
    used += entry.used;
    limit += entry.limit;
  }

  return { used, limit, remaining: Math.max(0, limit - used) };
}
