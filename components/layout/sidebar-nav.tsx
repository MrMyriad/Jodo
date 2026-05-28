"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  CreditCard,
  FileText,
  Home,
  LayoutTemplate,
  Link2,
  Settings,
  Workflow,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";
import { t, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/sign-out-button";

type SidebarNavProps = {
  userName: string;
  userEmail: string;
  plan: string;
  language: string;
};

const navItems = [
  { href: "/dashboard", labelKey: "nav.home", icon: Home },
  { href: "/workflows", labelKey: "nav.workflows", icon: Workflow },
  { href: "/templates", labelKey: "nav.templates", icon: LayoutTemplate },
  { href: "/connections", labelKey: "nav.connect", icon: Link2 },
  { href: "/gst-desk", labelKey: "nav.gstDesk", icon: FileText },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/pricing", labelKey: "nav.pricing", icon: CreditCard },
] as const satisfies ReadonlyArray<{
  href: string;
  labelKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
}>;

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function SidebarNav({
  userName,
  userEmail,
  plan,
  language,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold">JODO</span>
            <Badge variant="secondary">{plan}</Badge>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isNavItemActive(pathname, href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="mr-2 size-4" />
              {t(language, labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <LanguageSwitcher initialLanguage={language} />
          <SignOutButton />
        </div>
      </aside>

      <div className="w-full border-b bg-background px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <p className="font-semibold">JODO</p>
          <Badge variant="secondary">{plan}</Badge>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1 text-sm whitespace-nowrap",
                isNavItemActive(pathname, href)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t(language, labelKey)}
            </Link>
          ))}
        </nav>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <div className="shrink-0">
            <SignOutButton compact />
          </div>
        </div>
        <div className="mt-3">
          <LanguageSwitcher initialLanguage={language} />
        </div>
      </div>
    </>
  );
}
