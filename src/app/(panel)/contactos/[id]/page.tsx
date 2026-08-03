import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ContactEditor } from "@/components/contact-editor";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import { parseCustomFields } from "@/lib/merge";
import { formatDateTime } from "@/lib/utils";
import { EVENT_TYPE } from "@/lib/constants";

export const metadata: Metadata = { title: "Ficha de contacto" };
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, { label: string; tone: "neutral" | "success" | "brand" | "warning" | "danger" }> = {
  SENT: { label: "Enviado", tone: "neutral" },
  OPEN: { label: "Abierto", tone: "success" },
  CLICK: { label: "Clic", tone: "brand" },
  UNSUBSCRIBE: { label: "Baja", tone: "warning" },
  BOUNCE: { label: "Rebote", tone: "danger" },
  FAILED: { label: "Fallo", tone: "danger" },
};

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [contact, lists] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        memberships: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { campaign: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!contact) notFound();

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;

  return (
    <>
      <Link
        href="/contactos"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
      >
        <IconChevronLeft size={14} />
        Volver a contactos
      </Link>

      <PageHeader title={name} description={contact.email} />

      <ContactEditor
        contact={{
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company,
          jobTitle: contact.jobTitle,
          phone: contact.phone,
          country: contact.country,
          notes: contact.notes,
          status: contact.status,
          customFields: parseCustomFields(contact.customFields),
          listIds: contact.memberships.map((membership) => membership.listId),
        }}
        lists={lists}
      />

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Actividad"
            description="Envíos, aperturas y clics registrados para este contacto."
          />
          {contact.events.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              Todavía no hay actividad registrada.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {contact.events.map((event) => {
                const meta = EVENT_LABELS[event.type] ?? { label: event.type, tone: "neutral" as const };
                return (
                  <li key={event.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <div className="min-w-0">
                        {event.campaign ? (
                          <Link
                            href={`/campanas/${event.campaign.id}`}
                            className="block truncate text-sm text-ink hover:text-brand"
                          >
                            {event.campaign.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-ink-muted">Sin campaña asociada</span>
                        )}
                        {event.type === EVENT_TYPE.CLICK && event.url ? (
                          <span className="block truncate text-xs text-ink-faint">{event.url}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-ink-faint">{formatDateTime(event.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
