import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TemplatesManager } from "@/components/templates-manager";

export const metadata: Metadata = { title: "Plantillas" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireUser();

  const templates = await prisma.template.findMany({
    where: { isArchived: false },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Plantillas"
        description="Diseños reutilizables. Al crear una campaña desde una plantilla se copia su contenido."
      />

      <TemplatesManager
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          subject: template.subject,
          html: template.html,
          category: template.category,
          updatedAt: template.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
