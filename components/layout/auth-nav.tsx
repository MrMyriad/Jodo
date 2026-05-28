"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthNavProps = {
  className?: string;
};

function getDisplayName(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name.trim();
  }

  if (email?.trim()) {
    return email.trim();
  }

  return "Account";
}

function getInitial(nameOrEmail: string): string {
  return nameOrEmail.trim().charAt(0).toUpperCase() || "J";
}

export function AuthNav({ className }: AuthNavProps) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return (
      <div
        aria-label="Loading account menu"
        className={cn(
          "h-9 w-28 animate-pulse rounded-full bg-white/[0.06]",
          className,
        )}
      />
    );
  }

  if (status === "authenticated" && user?.email) {
    const displayName = getDisplayName(user.name, user.email);

    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Link
          href="/dashboard"
          prefetch={false}
          className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-flex"
        >
          Dashboard
        </Link>

        <div className="group relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            aria-label="Open account menu"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#6366f1] text-xs font-semibold text-white">
              {getInitial(displayName)}
            </span>
            <span className="hidden max-w-36 truncate md:inline">
              {displayName}
            </span>
          </button>

          <div className="invisible absolute right-0 z-50 mt-2 w-64 translate-y-1 rounded-2xl border border-white/10 bg-[#121821] p-2 opacity-0 shadow-2xl shadow-black/30 transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <div className="border-b border-white/[0.06] px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <UserCircle className="size-4 text-[#c7d2fe]" />
                <span className="truncate">{displayName}</span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {user.email}
              </p>
            </div>

            <Link
              href="/dashboard"
              prefetch={false}
              className="mt-2 flex rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              prefetch={false}
              className="flex rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href="/auth/signin"
        prefetch={false}
        className="text-sm font-medium text-slate-400 transition hover:text-white"
      >
        Sign in
      </Link>
      <Link
        href="/auth/signin"
        prefetch={false}
        className="hidden min-h-9 items-center rounded-lg bg-[#6366f1] px-4 text-sm font-medium text-white transition hover:bg-[#5558e3] sm:inline-flex"
      >
        Get started
      </Link>
    </div>
  );
}
