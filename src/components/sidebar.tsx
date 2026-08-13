"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./logo";
import {
  IconDashboard,
  IconList,
  IconLogout,
  IconMail,
  IconSettings,
  IconTemplate,
  IconUpload,
  IconUsers,
} from "./icons";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/panel", label: "Resumen", icon: IconDashboard },
  { href: "/campanas", label: "Campañas", icon: IconMail },
  { href: "/contactos", label: "Contactos", icon: IconUsers },
  { href: "/listas", label: "Listas", icon: IconList },
  { href: "/plantillas", label: "Plantillas", icon: IconTemplate },
  { href: "/importar", label: "Importar", icon: IconUpload },
  { href: "/ajustes", label: "Ajustes", icon: IconSettings },
] as const;

export type SidebarUser = {
  name: string | null;
  email: string;
  imageUrl: string | null;
  roleLabel: string;
};

export function Sidebar({ user, quota }: { user: SidebarUser; quota: { sent: number; limit: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const remaining = Math.max(0, quota.limit - quota.sent);
  const percent = quota.limit > 0 ? Math.min(100, (quota.sent / quota.limit) * 100) : 0;

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        // `/campanas/abc` debe marcar "Campañas", pero `/panel` no debe activarse
        // desde `/paneles` — de ahí la comprobación del separador.
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface-3 font-medium text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className={active ? "text-brand" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <div className="mb-3 rounded-lg bg-surface-2 p-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-ink-muted">Cuota (24 h)</span>
          <span className="tabular-nums text-ink">
            {quota.sent}/{quota.limit}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full", percent > 85 ? "bg-warning" : "bg-brand")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">Quedan {remaining} envíos en tu cuenta</p>
      </div>

      <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="size-8 shrink-0 rounded-full" />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
            {initials(user.name ?? user.email)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink">{user.name ?? user.email}</p>
          <p className="truncate text-[11px] text-ink-faint">{user.roleLabel}</p>
        </div>
        {/* Formulario y no enlace: un GET a /logout lo dispararía el prefetch
            del navegador y cerraría la sesión sin que nadie pulse nada. */}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title="Cerrar sesión"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <IconLogout size={16} />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra superior en móvil */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Abrir menú"
          className="rounded-md p-2 text-ink-muted hover:bg-surface-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface pt-4">
            <div className="px-4 pb-4">
              <Wordmark />
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-4 py-5">
          <Wordmark />
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
