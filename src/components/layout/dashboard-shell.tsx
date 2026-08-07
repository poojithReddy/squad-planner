import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/teams/new", label: "Create team", icon: "plus" },
];

export function DashboardShell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-slate-200 bg-ink px-4 py-6 text-white lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 text-lg font-bold"><BrandMark />Squad Planner</Link>
        <nav aria-label="Dashboard navigation" className="mt-10 space-y-1">
          {links.map((link) => <DashboardLink key={link.href} {...link} />)}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="truncate px-2 text-sm font-semibold">{displayName}</p>
          <form action={signOut}><button className="mt-3 min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">Sign out</button></form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-pitch text-white"><BrandMark /></span>Squad Planner</Link>
          <p className="hidden text-sm font-semibold text-slate-600 lg:block">Tournament workspace</p>
          <form action={signOut}><button className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-ink">Sign out</button></form>
        </header>
        <main id="main-content" className="pb-24 lg:pb-0">{children}</main>
        <nav aria-label="Mobile dashboard navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-slate-200 bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {links.map((link) => <DashboardLink key={link.href} {...link} mobile />)}
        </nav>
      </div>
    </div>
  );
}

function DashboardLink({ href, label, icon, mobile = false }: { href: string; label: string; icon: string; mobile?: boolean }) {
  return <Link href={href} className={`flex min-h-11 items-center gap-3 rounded-xl font-semibold transition ${mobile ? "justify-center text-xs text-slate-600" : "px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon name={icon} />{label}</Link>;
}

function BrandMark() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m7 4 10 16M10 3l2 4M14 17l2 4" strokeLinecap="round" /><circle cx="5" cy="17" r="2.2" fill="currentColor" stroke="none" /></svg>;
}

function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={name === "plus" ? "M12 5v14M5 12h14" : "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"} /></svg>;
}
