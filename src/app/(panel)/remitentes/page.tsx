import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SendersManager } from "@/components/senders-manager";
import { aggregateCapacity, getCapacity } from "@/lib/quota";
import { transportReadiness } from "@/lib/transport";
import { hasResendApiKey } from "@/lib/settings";
import { TRANSPORT_LIMITS, type Transport } from "@/lib/constants";

export const metadata: Metadata = { title: "Remitentes" };
export const dynamic = "force-dynamic";

export default async function SendersPage() {
  await requireUser();

  const [senders, accounts, resendConfigured] = await Promise.all([
    prisma.sender.findMany({
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
      include: { user: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { email: "asc" } }),
    hasResendApiKey(),
  ]);

  const capacity = await getCapacity(senders);

  const rows = capacity.map((entry, index) => {
    const sender = senders[index];
    const readiness = transportReadiness(sender);
    const transport = sender.transport as Transport;

    return {
      id: sender.id,
      label: sender.label,
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      replyTo: sender.replyTo,
      transport,
      transportLabel: TRANSPORT_LIMITS[transport]?.label ?? transport,
      userEmail: sender.user?.email ?? null,
      smtpUser: sender.smtpUser,
      hasSmtpPassword: Boolean(sender.smtpPassword),
      isActive: sender.isActive,
      dailyQuota: sender.dailyQuota,
      sendRatePerHour: sender.sendRatePerHour,
      quotaKey: entry.quotaKey,
      used: entry.used,
      limit: entry.limit,
      remaining: readiness.ready ? entry.remaining : 0,
      ready: readiness.ready,
      reason: readiness.reason ?? null,
    };
  });

  // Los totales se agregan por clave de cuota: dos alias de la misma cuenta no
  // suman dos veces el mismo límite.
  const usable = capacity.filter((_, index) => rows[index].isActive && rows[index].ready);
  const totals = aggregateCapacity(usable);

  return (
    <>
      <PageHeader
        title="Remitentes"
        description="Las direcciones desde las que sale el correo. Cuantas más, más capacidad tienen las campañas."
      />

      <SendersManager
        senders={rows}
        accounts={accounts.map((account) => ({
          id: account.id,
          email: account.email,
          name: account.name,
          authorized: Boolean(account.refreshToken || account.accessToken),
        }))}
        resendConfigured={resendConfigured}
        totalRemaining={totals.remaining}
        totalLimit={totals.limit}
      />
    </>
  );
}
