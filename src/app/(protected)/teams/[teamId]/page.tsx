/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import { Detail, formatBudget } from "@/components/teams/team-card";
import { requireUser } from "@/lib/auth/session";
import { getAuthorisedTeam } from "@/lib/teams/queries";

const modules = ["Players", "Buckets", "Probable Teams", "Auction", "Squad", "Tournament", "Volunteer Duties"];

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  await requireUser();
  const { teamId } = await params;
  const team = await getAuthorisedTeam(teamId);
  if (!team) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-pitch">← All teams</Link>
      <article className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-40 bg-slate-200 sm:h-56 lg:h-64" style={{ background: team.bannerSignedUrl ? undefined : `linear-gradient(120deg, ${team.primary_colour ?? "#16734b"}, ${team.secondary_colour ?? "#11211a"})` }}>{team.bannerSignedUrl ? <img src={team.bannerSignedUrl} alt={`${team.name} banner`} className="h-full w-full object-cover" /> : null}</div>
        <div className="px-5 pb-7 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white text-2xl font-black text-white shadow-md sm:size-32" style={{ backgroundColor: team.primary_colour ?? "#16734b" }}>{team.logoSignedUrl ? <img src={team.logoSignedUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" /> : team.name.slice(0, 2).toUpperCase()}</div>
            <div className="pb-1"><p className="text-sm font-bold text-pitch">Team workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{team.name}</h1></div>
          </div>
          <dl className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3 lg:grid-cols-5"><Detail label="Captain" value={team.captain_name} /><Detail label="Vice captain" value={team.vice_captain_name || "Not set"} /><Detail label="Manager" value={team.manager_name || "Not set"} /><Detail label="Squad size" value={String(team.squad_size)} /><Detail label="Auction budget" value={formatBudget(team.total_auction_budget)} /></dl>
        </div>
      </article>

      <section className="mt-8"><div><p className="text-sm font-bold text-pitch">Coming next</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">Team modules</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{modules.map((module) => <article key={module} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid size-10 place-items-center rounded-xl bg-pitch/10 font-bold text-pitch">•</div><h3 className="mt-5 font-bold text-ink">{module}</h3><p className="mt-1 text-sm text-slate-500">Planned for a future phase.</p></article>)}</div></section>
    </div>
  );
}
