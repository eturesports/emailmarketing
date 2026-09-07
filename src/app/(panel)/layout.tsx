import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aggregateCapacity, getCapacity } from "@/lib/quota";
import { Sidebar } from "@/components/sidebar";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // La barra lateral muestra la capacidad conjunta de los remitentes activos:
  // con varios remitentes, la cuota de una cuenta suelta ya no dice gran cosa.
  const senders = await prisma.sender.findMany({ where: { isActive: true } });
  const capacity = await getCapacity(senders);

  const { used, limit } = aggregateCapacity(capacity);

  return (
    <div className="min-h-dvh">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          roleLabel: ROLE_LABELS[user.role as Role] ?? user.role,
        }}
        quota={{ sent: used, limit }}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
