"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  compact?: boolean;
};

export function SignOutButton({ compact = false }: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "sm" : "default"}
      className={compact ? "px-3" : "w-full justify-start"}
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
    >
      <LogOut className="mr-2 size-4" />
      {compact ? "Out" : "Sign out"}
    </Button>
  );
}
