/**
 * Worker de la cola de envío para ejecución local o en un servidor propio.
 *
 *   npm run worker              # bucle continuo, una pasada por minuto
 *   npm run worker -- --once    # una sola pasada y salir (ideal para cron)
 *
 * En Vercel no hace falta: allí basta con configurar el cron sobre /api/cron
 * (ver vercel.json). Este script llama directamente a la misma lógica, así que
 * no depende de que la aplicación web esté levantada.
 */

import { runQueue } from "../src/lib/sender";
import { pruneOldBuckets } from "../src/lib/quota";
import { prisma } from "../src/lib/db";

const INTERVAL_MS = 60_000;
/** Cada cuántas pasadas se limpian los cubos de cuota caducados. */
const PRUNE_EVERY = 60;

let stopping = false;
let passCount = 0;

async function pass(): Promise<void> {
  const started = Date.now();

  try {
    const result = await runQueue();
    const sent = result.processed.reduce((total, entry) => total + entry.sent, 0);
    const failed = result.processed.reduce((total, entry) => total + entry.failed, 0);

    if (result.activated.length > 0) {
      console.log(`[worker] campañas activadas: ${result.activated.join(", ")}`);
    }
    if (sent > 0 || failed > 0) {
      console.log(`[worker] ${sent} enviados, ${failed} fallidos (${Date.now() - started} ms)`);
    }

    for (const entry of result.processed) {
      if (entry.message) console.log(`[worker] ${entry.campaignId}: ${entry.message}`);
      if (entry.perSender && Object.keys(entry.perSender).length > 1) {
        const reparto = Object.entries(entry.perSender)
          .map(([email, count]) => `${email}: ${count}`)
          .join(", ");
        console.log(`[worker] reparto → ${reparto}`);
      }
    }

    passCount += 1;
    if (passCount % PRUNE_EVERY === 0) {
      const pruned = await pruneOldBuckets();
      if (pruned > 0) console.log(`[worker] ${pruned} cubos de cuota caducados eliminados`);
    }
  } catch (error) {
    console.error("[worker] error en la pasada:", error);
  }
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once");

  if (once) {
    await pass();
    await prisma.$disconnect();
    return;
  }

  console.log(`[worker] iniciado; una pasada cada ${INTERVAL_MS / 1000} s. Ctrl+C para parar.`);

  // Salida ordenada: se espera a que termine la pasada en curso antes de cerrar
  // la conexión, para no dejar destinatarios en estado intermedio.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (stopping) process.exit(1);
      stopping = true;
      console.log("\n[worker] parando tras la pasada actual…");
    });
  }

  while (!stopping) {
    await pass();
    if (stopping) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  await prisma.$disconnect();
  console.log("[worker] detenido.");
}

main().catch(async (error) => {
  console.error("[worker] fallo irrecuperable:", error);
  await prisma.$disconnect();
  process.exit(1);
});
