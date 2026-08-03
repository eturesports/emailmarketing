import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { IconChevronLeft, IconUsers } from "@/components/icons";
import { CONTACT_STATUS, CONTACT_STATUS_LABELS, type ContactStatus } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle de lista" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);

  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list) notFound();

  const [memberships, total, subscribed, campaigns] = await Promise.all([
    prisma.listMembership.findMany({
      where: { listId: id },
      include: { contact: true },
      orderBy: { addedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listMembership.count({ where: { listId: id } }),
    prisma.listMembership.count({ where: { listId: id, contact: { status: CONTACT_STATUS.SUBSCRIBED } } }),
    prisma.campaignList.findMany({
      where: { listId: id },
      include: { campaign: { select: { id: true, name: true, status: true, sentCount: true } } },
      take: 10,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Link
        href="/listas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
      >
        <IconChevronLeft size={14} />
        Volver a listas
      </Link>

      <PageHeader
        title={list.name}
        description={
          list.description ??
          `${formatNumber(total)} contactos, de los que ${formatNumber(subscribed)} pueden recibir campañas.`
        }
        action={
          <>
            <LinkButton href={`/contactos?listId=${list.id}`} variant="secondary">
              Ver en contactos
            </LinkButton>
            <LinkButton href={`/campanas/nueva?listId=${list.id}`}>Enviar campaña</LinkButton>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Contactos</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums">{formatNumber(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Pueden recibir</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-success">
            {formatNumber(subscribed)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Campañas</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums">{campaigns.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Color</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-4 rounded-full" style={{ backgroundColor: list.color }} />
            <code className="font-mono text-xs text-ink-muted">{list.color}</code>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Contactos de la lista" description={`Página ${page} de ${totalPages}`} />

        {memberships.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={28} />}
            title="La lista está vacía"
            description="Añade contactos desde la pantalla de contactos o importando un CSV directamente a esta lista."
            action={
              <Link href="/importar" className="text-sm text-brand hover:underline">
                Importar contactos →
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Contacto</Th>
                  <Th>Empresa</Th>
                  <Th>Estado</Th>
                  <Th>En la lista desde</Th>
                </tr>
              </thead>
              <tbody>
                {memberships.map(({ contact, addedAt }) => {
                  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
                  return (
                    <tr key={contact.id} className="transition-colors hover:bg-surface-2">
                      <Td>
                        <Link href={`/contactos/${contact.id}`} className="group block min-w-0">
                          <span className="block truncate text-sm font-medium group-hover:text-brand">
                            {name || contact.email}
                          </span>
                          {name ? (
                            <span className="block truncate text-xs text-ink-faint">{contact.email}</span>
                          ) : null}
                        </Link>
                      </Td>
                      <Td className="text-sm text-ink-muted">{contact.company ?? "—"}</Td>
                      <Td>
                        <Badge tone={contact.status === CONTACT_STATUS.SUBSCRIBED ? "success" : "neutral"}>
                          {CONTACT_STATUS_LABELS[contact.status as ContactStatus] ?? contact.status}
                        </Badge>
                      </Td>
                      <Td className="text-xs text-ink-faint">{formatDate(addedAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-end gap-2 px-4 py-3">
                {page > 1 ? (
                  <Link
                    href={`/listas/${list.id}?page=${page - 1}`}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                  >
                    Anterior
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link
                    href={`/listas/${list.id}?page=${page + 1}`}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                  >
                    Siguiente
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </Card>

      {campaigns.length > 0 ? (
        <Card className="mt-4">
          <CardHeader title="Campañas que usan esta lista" />
          <ul className="divide-y divide-line-soft">
            {campaigns.map(({ campaign }) => (
              <li key={campaign.id}>
                <Link
                  href={`/campanas/${campaign.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="truncate">{campaign.name}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {formatNumber(campaign.sentCount)} enviados
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
