"use client";

import { SessionProvider } from "next-auth/react";
import { SyncOnLogin } from "./SyncOnLogin";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncOnLogin />
      {children}
    </SessionProvider>
  );
}
