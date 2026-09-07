import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ContactsTable, NewContactForm } from "@/components/contacts-table";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Contactos" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; listId?: string; verification?: string; page?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const listId = params.listId ?? "";
  const verification = params.verification ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { company: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(listId ? { memberships: { some: { listId } } } : {}),
    ...(verification ? { verification } : {}),
  };

  const [contacts, total, lists] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { memberships: { include: { list: { select: { id: true, name: true, color: true } } } } },
    }),
    prisma.contact.count({ where }),
    prisma.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Contactos"
        description={`${formatNumber(total)} contacto(s) ${q || status || listId || verification ? "que coinciden con el filtro" : "en la base de datos"}.`}
        action={<NewContactForm lists={lists} />}
      />

      <ContactsTable
        contacts={contacts.map((contact) => ({
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company,
          status: contact.status,
          verification: contact.verification,
          verificationReason: contact.verificationReason,
          createdAt: contact.createdAt.toISOString(),
          lists: contact.memberships.map((membership) => membership.list),
        }))}
        lists={lists}
        filters={{ q, status, listId, verification }}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
