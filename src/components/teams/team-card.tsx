/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type { TeamCardView } from "@/types/team";

export function TeamCard({ team }: { team: TeamCardView }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-24 bg-slate-100" style={{ background: team.bannerSignedUrl ? undefined : `linear-gradient(120deg, ${team.primary_colour ?? "#16734b"}, ${team.secondary_colour ?? "#11211a"})` }}>
        {team.bannerSignedUrl ? <img src={team.bannerSignedUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="p-5">
        <div className="-mt-12 flex items-end gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 text-xl font-black text-white shadow-sm" style={{ backgroundColor: team.primary_colour ?? "#16734b" }}>
            {team.logoSignedUrl ? <img src={team.logoSignedUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" /> : team.name.slice(0, 2).toUpperCase()}
          </div>
          <h2 className="min-w-0 truncate pb-1 text-xl font-bold text-ink">{team.name}</h2>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Captain" value={team.captain_name} />
          <Detail label="Vice captain" value={team.vice_captain_name || "Not set"} />
          <Detail label="Squad size" value={String(team.squad_size)} />
          <Detail label="Auction budget" value={formatBudget(team.total_auction_budget)} />
        </dl>
        <Link href={`/teams/${team.id}`} className="mt-6 flex min-h-11 items-center justify-center rounded-xl bg-pitch px-4 text-sm font-bold text-white hover:bg-pitch-dark">Open Team</Link>
      </div>
    </article>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 truncate font-semibold text-ink">{value}</dd></div>;
}

export function formatBudget(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}
