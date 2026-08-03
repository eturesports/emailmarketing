import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = isAdmin(user);

  const team = admin
    ? await prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }] })
    : [];

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
      />

      <Card className="mt-4">
        <CardHeader title="Instalación" description="Datos de configuración del servidor (sólo lectura)." />
        <dl className="divide-y divide-line-soft text-sm">
          <Row label="URL pública" value={env.appUrl} hint="Debe ser accesible desde internet para el seguimiento y las bajas." />
          <Row label="Zona horaria" value={env.timezone} hint="Se usa para programar envíos y para el corte de la cuota diaria." />
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
