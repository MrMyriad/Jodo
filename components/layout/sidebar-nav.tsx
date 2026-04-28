"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutTemplate, Link2, Settings, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/sign-out-button";

type SidebarNavProps = {
  userName: string;
  userEmail: string;
  plan: string;
};

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/connections", label: "Connect", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function SidebarNav({ userName, userEmail, plan }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold">AutomateDesi</span>
            <Badge variant="secondary">{plan}</Badge>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
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
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <SignOutButton />
        </div>
      </aside>

      <div className="border-b bg-background px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <p className="font-semibold">AutomateDesi</p>
          <Badge variant="secondary">{plan}</Badge>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map(({ href, label }) => (
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
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
