import { requireUser } from "@/lib/auth";
import { getSentInWindow } from "@/lib/sender";
import { effectiveLimit } from "@/lib/quota";
import { Sidebar } from "@/components/sidebar";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const sentInWindow = await getSentInWindow(user.id);

  return (
    <div className="min-h-dvh">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          roleLabel: ROLE_LABELS[user.role as Role] ?? user.role,
        }}
        quota={{ sent: sentInWindow, limit: effectiveLimit(user) }}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
