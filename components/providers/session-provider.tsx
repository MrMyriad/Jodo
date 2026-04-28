"use client";

import { SessionProvider } from "next-auth/react";

type SessionProviderProps = {
  children: React.ReactNode;
};

export function AppSessionProvider({ children }: SessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
