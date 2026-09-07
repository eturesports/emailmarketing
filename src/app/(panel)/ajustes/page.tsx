import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { env } from "@/lib/env";
import { aggregateCapacity, getCapacity } from "@/lib/quota";
import { getResendConfig } from "@/lib/settings";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = isAdmin(user);

  const [team, senders, resendConfig] = await Promise.all([
    admin
      ? prisma.user.findMany({
          orderBy: [{ role: "asc" }, { email: "asc" }],
          include: { _count: { select: { senders: true } } },
        })
      : Promise.resolve([]),
    prisma.sender.findMany({ where: { isActive: true } }),
    getResendConfig(),
  ]);

  const capacity = await getCapacity(senders);
  const { limit: ceiling } = aggregateCapacity(capacity);

  return (
    <>
      <PageHeader title="Ajustes" description="Conexión con Resend, equipo y datos de la instalación." />

      <SettingsForm
        team={team.map((member) => ({
          id: member.id,
          email: member.email,
          name: member.name,
          role: member.role,
          isActive: member.isActive,
          senderCount: member._count.senders,
        }))}
        isAdmin={admin}
        currentUserId={user.id}
        resendConfig={resendConfig}
        appUrl={env.appUrl}
      />

      <Card className="mt-4">
        <CardHeader
          title="Capacidad de envío"
          description="Suma de lo que pueden enviar todos los remitentes activos."
        />
        <div className="p-5">
          <p className="text-3xl font-semibold tabular-nums text-brand">{formatNumber(ceiling)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            correos cada 24 h, repartidos entre {senders.length} remitente(s).
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            Los proveedores limitan por cuenta, no por dominio. Para subir esta cifra: pasar remitentes al relay SMTP
            (de 2.000 a 10.000 cada uno), añadir más remitentes en{" "}
            <Link href="/remitentes" className="text-brand hover:underline">
              Remitentes
            </Link>{" "}
            o usar Resend, que no impone techo por dirección.
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Instalación" description="Datos de configuración del servidor (sólo lectura)." />
        <dl className="divide-y divide-line-soft text-sm">
          <Row
            label="URL pública"
            value={env.appUrl}
            hint="Debe ser accesible desde internet para el seguimiento, las bajas y los webhooks."
          />
          <Row
            label="Zona horaria"
            value={env.timezone}
            hint="Se usa para programar envíos y mostrar fechas. La cuota va por ventana móvil de 24 h."
          />
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
                ? "Llama periódicamente a /api/cron para vaciar la cola y encolar los seguimientos."
                : "Define CRON_SECRET para que los envíos programados y los seguimientos se procesen solos."
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
