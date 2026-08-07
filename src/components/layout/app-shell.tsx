import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { PublicFooter } from "@/components/layout/public-footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
