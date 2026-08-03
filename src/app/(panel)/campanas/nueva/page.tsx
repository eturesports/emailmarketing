import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import { NewCampaignForm } from "@/components/new-campaign-form";

export const metadata: Metadata = { title: "Nueva campaña" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string; templateId?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const [lists, templates] = await Promise.all([
    prisma.contactList.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } } },
    }),
    prisma.template.findMany({
      where: { isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, subject: true, category: true },
    }),
  ]);

  return (
    <>
      <Link
        href="/campanas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
      >
        <IconChevronLeft size={14} />
        Volver a campañas
      </Link>

      <PageHeader title="Nueva campaña" description="Empieza en blanco o parte de una de tus plantillas." />

      <NewCampaignForm
        lists={lists.map((list) => ({
          id: list.id,
          name: list.name,
          color: list.color,
          contactCount: list._count.memberships,
        }))}
        templates={templates}
        defaultListId={params.listId}
        defaultTemplateId={params.templateId}
      />
    </>
  );
}
