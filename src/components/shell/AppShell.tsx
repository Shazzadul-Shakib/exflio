"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { logoutAction } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/types";
import { cx } from "@/components/ui";
import { Logomark } from "@/components/Logomark";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand"
                : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: PublicUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 pt-1">
        <Logomark size="sm" />
        <span className="text-base font-semibold text-text-primary">
          Exflio
        </span>
      </div>
      <NavLinks pathname={pathname} onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-text-secondary">
            {initials(user.name) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-text-primary">
              {user.name}
            </p>
            <p className="truncate text-[12px] text-text-muted">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-status-critical"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-surface md:block">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-surface shadow-xl animate-fade-in">
            <SidebarContent
              user={user}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">
            {activeItem?.label ?? "Exflio"}
          </h1>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-350">{children}</div>
        </main>
      </div>
    </div>
  );
}
