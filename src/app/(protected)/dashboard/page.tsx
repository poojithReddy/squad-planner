import Link from "next/link";

import { TeamCard } from "@/components/teams/team-card";
import { requireUser } from "@/lib/auth/session";
import { getAuthorisedTeams } from "@/lib/teams/queries";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireUser();
  const [{ teams, setupRequired }, params] = await Promise.all([getAuthorisedTeams(), searchParams]);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      {params.message === "password-updated" ? <p role="status" className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Your password has been updated.</p> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-bold text-pitch">Overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Your teams</h1><p className="mt-2 text-sm text-slate-500">Only teams you are authorised to access are shown.</p></div>
        {teams.length ? <Link href="/teams/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white hover:bg-pitch-dark">Create Team</Link> : null}
      </div>

      {setupRequired ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"><p className="text-sm font-bold text-amber-900">Migration has not been applied yet.</p><p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">Run <code>supabase/migrations/001_initial_schema.sql</code> in Supabase SQL Editor, then refresh this page.</p><Link href="/dev/supabase-check" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-900">Open connection check</Link></section>
      ) : teams.length === 0 ? (
        <section className="mt-8 grid min-h-80 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <div className="max-w-md"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-pitch/10 text-2xl text-pitch">+</div><h2 className="mt-5 text-xl font-bold">You have not created a team yet.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Create your first team to begin organising your tournament workspace.</p><Link href="/teams/new" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-pitch px-5 text-sm font-bold text-white hover:bg-pitch-dark">Create Team</Link></div>
        </section>
      ) : <section aria-label="Authorised teams" className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <TeamCard key={team.id} team={team} />)}</section>}
    </div>
  );
}
