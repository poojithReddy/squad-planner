import Link from "next/link";

import { TeamCard } from "@/components/teams/team-card";
import { requireUser } from "@/lib/auth/session";
import { getAuthorisedTeams } from "@/lib/teams/queries";
import { getTournamentAdminMemberships } from "@/lib/tournament/admin-access";
import { getSuperAdminAccess } from "@/lib/platform/admin-access";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireUser();
  const [{ teams, setupRequired }, params,adminMemberships,platformAccess] = await Promise.all([getAuthorisedTeams(), searchParams,getTournamentAdminMemberships(),getSuperAdminAccess()]);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      {params.message === "password-updated" ? <p role="status" className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Your password has been updated.</p> : null}
      {platformAccess.isSuperAdmin?<section className="mb-6 rounded-3xl border border-pitch/20 bg-white p-6"><p className="text-sm font-black uppercase text-pitch">Platform access</p><h2 className="mt-1 text-xl font-black">Super Admin dashboard is available</h2><p className="mt-2 text-sm text-slate-500">Manage multiple tournaments and their administrative access without entering private team strategy.</p><Link href="/admin" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-pitch px-5 font-bold text-white">Open Super Admin</Link></section>:null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-bold text-pitch">Overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Your teams</h1><p className="mt-2 text-sm text-slate-500">Only teams you are authorised to access are shown.</p></div>
        {teams.length ? <Link href="/teams/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white hover:bg-pitch-dark">Create Standalone Team</Link> : null}
      </div>

      {setupRequired ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"><p className="text-sm font-bold text-amber-900">Migration has not been applied yet.</p><p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">Run <code>supabase/migrations/001_initial_schema.sql</code> in Supabase SQL Editor, then refresh this page.</p><Link href="/dev/supabase-check" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-900">Open connection check</Link></section>
      ) : teams.length === 0 && adminMemberships.length ? <section className="mt-8 rounded-3xl border bg-white p-7"><h2 className="text-xl font-black">Tournament administration</h2><p className="mt-2 text-slate-500">You do not currently have private team access. This is expected for a Tournament Admin.</p><div className="mt-5 flex flex-wrap gap-2">{adminMemberships.map(item=><Link key={item.tournament_id} href={`/tournaments/${item.tournament_id}/admin`} className="team-primary rounded-xl px-5 py-3 font-bold">Open Tournament Admin</Link>)}</div></section> : teams.length === 0 ? (
        <section className="mt-8 grid min-h-80 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <div className="max-w-md"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-pitch/10 text-2xl text-pitch">+</div><h2 className="mt-5 text-xl font-bold">You have not created a team yet.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Create your first team to begin organising your tournament workspace.</p><Link href="/teams/new" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-pitch px-5 text-sm font-bold text-white hover:bg-pitch-dark">Create Team</Link></div>
        </section>
      ) : <section aria-label="Authorised teams" className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <TeamCard key={team.id} team={team} />)}</section>}
    </div>
  );
}
