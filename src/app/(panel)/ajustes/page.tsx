import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { env } from "@/lib/env";
import { getSentInWindow, effectiveLimit } from "@/lib/quota";
import { getResendConfig } from "@/lib/settings";
import { TRANSPORT_LIMITS, type Transport } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = isAdmin(user);

  const [team, usedInWindow, pool, resendConfig] = await Promise.all([
    admin ? prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }] }) : Promise.resolve([]),
    getSentInWindow(user.id),
    prisma.user.findMany({ where: { isActive: true, canSend: true }, select: { transport: true, dailyQuota: true } }),
    getResendConfig(),
  ]);

  // Techo conjunto del dominio: la suma de lo que permite cada cuenta prestada
  // al grupo de remitentes. Es la cifra que de verdad limita una campaña grande.
  const poolCeiling = pool.reduce(
    (total, member) => total + effectiveLimit(member, resendConfig.dailyLimit),
    0,
  );

  return (
    <>
      <PageHeader title="Ajustes" description="Configura tu remitente, tus límites de envío y el equipo." />

      <SettingsForm
        user={{
          id: user.id,
          email: user.email,
          fromName: user.fromName,
          replyTo: user.replyTo,
          dailyQuota: user.dailyQuota,
          sendRatePerHour: user.sendRatePerHour,
          transport: user.transport as Transport,
          canSend: user.canSend,
          smtpUser: user.smtpUser,
          hasSmtpPassword: Boolean(user.smtpPassword),
          usedInWindow,
        }}
        team={team.map((member) => ({
          id: member.id,
          email: member.email,
          name: member.name,
          role: member.role,
          isActive: member.isActive,
          lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
        }))}
        isAdmin={admin}
        currentUserId={user.id}
        resendConfig={resendConfig}
        appUrl={env.appUrl}
      />

      <Card className="mt-4">
        <CardHeader
          title="Capacidad del dominio"
          description="Suma de lo que pueden enviar todas las cuentas prestadas al grupo de remitentes."
        />
        <div className="p-5">
          <p className="text-3xl font-semibold tabular-nums text-brand">{formatNumber(poolCeiling)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            correos cada 24 h, repartidos entre {pool.length} cuenta(s).
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            Google aplica sus límites por cuenta, no por dominio. Para subir esta cifra hay dos vías, combinables:
            pasar cuentas al relay SMTP (de 2.000 a 10.000 cada una) y sumar más cuentas de Workspace al grupo.
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Instalación" description="Datos de configuración del servidor (sólo lectura)." />
        <dl className="divide-y divide-line-soft text-sm">
          <Row label="URL pública" value={env.appUrl} hint="Debe ser accesible desde internet para el seguimiento y las bajas." />
          <Row label="Zona horaria" value={env.timezone} hint="Se usa para programar envíos y mostrar fechas. La cuota va por ventana móvil de 24 h, no por día natural." />
          <Row
            label="Dominios autorizados"
            value={env.allowedDomains.length > 0 ? env.allowedDomains.join(", ") : "Sin restricción"}
            hint="Variable ALLOWED_DOMAINS del fichero .env."
          />
          <Row
            label="Worker de envío"
            value={env.cronSecret ? "Configurado" : "Sin configurar"}
            hint={
              env.cronSecret
                ? "Llama periódicamente a /api/cron para ir vaciando la cola."
                : "Define CRON_SECRET para que los envíos programados y por lotes se procesen solos."
            }
          />
        </dl>
      </Card>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
      <div>
        <dt className="font-medium text-ink">{label}</dt>
        <p className="text-xs text-ink-faint">{hint}</p>
      </div>
      <dd className="font-mono text-xs text-ink-muted">{value}</dd>
    </div>
  );
}
