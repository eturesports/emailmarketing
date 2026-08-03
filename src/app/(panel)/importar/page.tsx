import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ImportWizard } from "@/components/import-wizard";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Importar contactos" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireUser();

  const [lists, history] = await Promise.all([
    prisma.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Importar contactos"
        description="Sube un CSV o un Excel y la plataforma reconocerá las columnas por ti."
      />

      <ImportWizard lists={lists} />

      {history.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Importaciones recientes" />
          <ul className="divide-y divide-line-soft">
            {history.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.filename}</p>
                  <p className="text-xs text-ink-faint">
                    {job.user?.name ?? job.user?.email ?? "—"} · {formatDateTime(job.createdAt)}
                  </p>
                </div>
                <div className="flex gap-4 text-xs tabular-nums">
                  <span className="text-success">+{formatNumber(job.imported)} nuevos</span>
                  <span className="text-brand">{formatNumber(job.updated)} actualizados</span>
                  {job.invalid > 0 ? (
                    <span className="text-danger">{formatNumber(job.invalid)} con error</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="mt-6 text-xs text-ink-faint">
        Recuerda: sólo debes importar contactos que hayan dado su consentimiento para recibir comunicaciones
        comerciales. Todas las campañas incluyen enlace de baja, tal y como exige el RGPD. Consulta la{" "}
        <Link href="/ajustes" className="text-brand hover:underline">
          configuración de envío
        </Link>{" "}
        para ajustar el remitente.
      </p>
    </>
  );
}
