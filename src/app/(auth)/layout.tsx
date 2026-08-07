import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">{children}</section>
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-lg font-bold">Squad Planner</Link>
        <div className="max-w-xl">
          <span className="inline-flex rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-ink">Tournament ready</span>
          <p className="mt-6 text-4xl font-bold leading-tight tracking-[-0.04em]">One secure workspace for every decision your team makes.</p>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Prepare squads, manage access, and keep tournament planning organised from any device.</p>
        </div>
        <p className="text-xs text-slate-500">Responsive by design · Protected by Supabase RLS</p>
      </aside>
    </main>
  );
}
