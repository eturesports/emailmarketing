import type { User } from "@prisma/client";
import { prisma } from "./db";
import { QUOTA_WINDOW_HOURS } from "./constants";
import { transportLimit } from "./transport";

/**
 * Contabilidad de cuota.
 *
 * Google aplica sus límites sobre una **ventana móvil de 24 horas**, no sobre
 * el día natural: quien envía 2.000 correos a las 23:00 no recupera capacidad a
 * medianoche, sino a las 23:00 del día siguiente. Por eso el consumo se guarda
 * en cubos de una hora (UTC) y la cuota disponible se calcula sumando los
 * últimos 24 cubos, en lugar de contar «lo enviado hoy».
 *
 * La granularidad horaria hace que en la hora en curso se cuente de más (nunca
 * de menos), lo que deja el cálculo del lado conservador: preferimos enviar
 * algo menos que chocar con el límite de Google a mitad de campaña.
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

/** Correos enviados por una cuenta en las últimas 24 horas. */
export async function getSentInWindow(userId: string): Promise<number> {
  const result = await prisma.sendLog.aggregate({
    where: { userId, hour: { in: windowBuckets() } },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}

/** Igual que `getSentInWindow`, pero para varias cuentas de una sola consulta. */
export async function getSentInWindowFor(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.sendLog.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, hour: { in: windowBuckets() } },
    _sum: { count: true },
  });

  const totals = new Map<string, number>(userIds.map((id) => [id, 0]));
  for (const row of rows) totals.set(row.userId, row._sum.count ?? 0);
  return totals;
}

/**
 * Techo efectivo de una cuenta: el menor entre lo que permite Google para su
 * transporte y el tope propio que haya fijado el usuario para dejar margen a su
 * correo del día a día.
 */
export function effectiveLimit(user: Pick<User, "transport" | "dailyQuota">): number {
  return Math.min(transportLimit(user), user.dailyQuota);
}

/** Envíos que le quedan a una cuenta en la ventana actual. */
export async function getRemainingQuota(user: User): Promise<number> {
  return Math.max(0, effectiveLimit(user) - (await getSentInWindow(user.id)));
}

/** Anota un envío en el cubo horario correspondiente. */
export async function recordSend(userId: string, count = 1): Promise<void> {
  const hour = hourBucket();
  await prisma.sendLog.upsert({
    where: { userId_hour: { userId, hour } },
    create: { userId, hour, count },
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
  user: User;
  used: number;
  limit: number;
  remaining: number;
};

/** Capacidad restante de un conjunto de cuentas, para repartir una campaña. */
export async function getCapacity(users: User[]): Promise<SenderCapacity[]> {
  const used = await getSentInWindowFor(users.map((user) => user.id));

  return users.map((user) => {
    const limit = effectiveLimit(user);
    const consumed = used.get(user.id) ?? 0;
    return { user, used: consumed, limit, remaining: Math.max(0, limit - consumed) };
  });
}
