import { PrismaClient } from "@prisma/client";

/**
 * En desarrollo Next.js recarga los módulos en caliente, lo que crearía un
 * PrismaClient nuevo (y una conexión nueva) en cada cambio. Lo cacheamos en el
 * objeto global para evitar agotar el pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
