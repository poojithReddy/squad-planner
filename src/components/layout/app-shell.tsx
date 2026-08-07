import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main-content" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
      <MobileNavigation />
    </div>
  );
}
