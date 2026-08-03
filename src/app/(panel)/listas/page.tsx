import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ListsManager } from "@/components/lists-manager";

export const metadata: Metadata = { title: "Listas" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  await requireUser();

  const lists = await prisma.contactList.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true, campaignLists: true } } },
  });

  return (
    <>
      <PageHeader
        title="Listas"
        description="Agrupa contactos para segmentar tus campañas: prensa, patrocinadores, comunidad…"
      />

      <ListsManager
        lists={lists.map((list) => ({
          id: list.id,
          name: list.name,
          description: list.description,
          color: list.color,
          contactCount: list._count.memberships,
          campaignCount: list._count.campaignLists,
        }))}
      />
    </>
  );
}
