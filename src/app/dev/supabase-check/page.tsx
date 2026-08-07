import { notFound } from "next/navigation";

import { getSupabaseHealth } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export default async function SupabaseCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const health = await getSupabaseHealth();

  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-pitch">Development only</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Supabase connection check</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This page reports availability only. It never displays credentials, tokens, connection strings, or database records.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Summary label="Supabase Connection" ok={health.connected} />
          <Summary label="Database" ok={health.databaseReachable} />
        </div>

        <ul className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {health.checks.map((check) => (
            <li key={check.key} className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
              <span className="font-medium text-slate-700">{check.label}</span>
              <span className={check.ok ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                {check.ok ? "✓ Available" : "✕ Unavailable"}
              </span>
            </li>
          ))}
        </ul>

        {!health.databaseReachable ? <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Migration has not been applied yet, or the database tables are unavailable. Run <code>supabase/migrations/001_initial_schema.sql</code> manually, then refresh.</p> : null}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          This route returns a 404 in production. Restart the development server after changing `.env.local`.
        </p>
      </section>
    </main>
  );
}

function Summary({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${ok ? "text-emerald-800" : "text-red-800"}`}>{ok ? "Connected" : "Not connected"}</p>
    </div>
  );
}
