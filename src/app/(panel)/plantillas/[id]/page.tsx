import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import { TemplateEditor } from "@/components/template-editor";

export const metadata: Metadata = { title: "Editar plantilla" };
export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  return (
    <>
      <Link
        href="/plantillas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
      >
        <IconChevronLeft size={14} />
        Volver a plantillas
      </Link>

      <PageHeader title={template.name} description="Los cambios no afectan a las campañas ya creadas." />

      <TemplateEditor
        template={{
          id: template.id,
          name: template.name,
          subject: template.subject,
          html: template.html,
          previewText: template.previewText,
          category: template.category,
        }}
      />
    </>
  );
}
