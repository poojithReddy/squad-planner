import Link from "next/link";

import { PlayerFilters } from "@/components/players/player-filters";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getPermissionMap } from "@/lib/permissions/server";
import { permissionGranted } from "@/lib/permissions/registry";
import { getBuckets, getPlayers } from "@/lib/planning/queries";
import { AUCTION_STATUS_LABELS, AVAILABILITY_LABELS, formatMoney, PRIORITY_LABELS } from "@/types/planning";

export default async function PlayersPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { teamId } = await params;
  const filters = await searchParams;
  const [, players, buckets, permissions] = await Promise.all([requireTeamAccess(teamId), getPlayers(teamId), getBuckets(teamId),getPermissionMap("team",teamId)]);
  const canCreate=permissionGranted(permissions,"team_players","create"),canEdit=permissionGranted(permissions,"team_players","edit"),canImport=permissionGranted(permissions,"team_players","import");
  const status = filters.status === undefined ? "available" : filters.status;
  const shown = players.filter(player =>
    (!filters.search || player.name.toLowerCase().includes(filters.search.toLowerCase())) &&
    (!filters.role || player.role === filters.role) && (!filters.bucket || player.bucket_id === filters.bucket) &&
    (!filters.priority || player.priority === Number(filters.priority)) &&
    (!filters.availability || player.availability_status === filters.availability) &&
    (!status || player.auction_status === status));

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <TeamNav teamId={teamId} />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="team-accent-text text-sm font-bold">Private team strategy</p><h1 className="mt-1 text-3xl font-bold text-ink">Player pool</h1><p className="mt-2 text-sm text-slate-500">Search, rank and organise auction targets.</p></div>{canCreate||canImport ? <div className="grid grid-cols-2 gap-2 sm:flex">{canImport?<Link href={`/teams/${teamId}/players/import`} className="min-h-11 rounded-xl border border-[var(--team-primary)] px-4 py-3 text-center text-sm font-bold text-[var(--team-primary)]">Import players</Link>:null}{canCreate?<Link href={`/teams/${teamId}/players/new`} className="team-primary min-h-11 rounded-xl px-4 py-3 text-center text-sm font-bold">Add player</Link>:null}</div> : null}</div>
    <div className="mt-6"><PlayerFilters buckets={buckets} values={{...filters, status}} /></div>
    <p className="mt-5 text-sm font-semibold text-slate-500">{shown.length} player{shown.length === 1 ? "" : "s"}</p>
    <div className="mt-3 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Player","Role","Bucket","Priority","Availability","Expected","Status","Actions"].map(v => <th key={v} className="px-4 py-3">{v}</th>)}</tr></thead><tbody>{shown.map(player => <tr key={player.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-4 py-4 font-bold text-ink">{player.name}</td><td className="px-4 py-4">{player.role ?? "—"}</td><td className="px-4 py-4">{player.auction_buckets?.name ?? "Unassigned"}</td><td className="px-4 py-4">{player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"}</td><td className="px-4 py-4">{AVAILABILITY_LABELS[player.availability_status]}</td><td className="px-4 py-4">{formatMoney(player.expected_price)}</td><td className="px-4 py-4">{AUCTION_STATUS_LABELS[player.auction_status]}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Link href={`/teams/${teamId}/players/${player.id}`} className="team-accent-text font-bold">View</Link>{canEdit ? <Link href={`/teams/${teamId}/players/${player.id}/edit`} className="font-bold text-slate-600">Edit</Link> : null}</div></td></tr>)}</tbody></table></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:hidden">{shown.map(player => <article key={player.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-bold text-ink">{player.name}</h2><p className="mt-1 text-sm text-slate-500">{player.role ?? "Role not set"}</p></div><span className="h-fit shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{AUCTION_STATUS_LABELS[player.auction_status]}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Item label="Priority" value={player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"}/><Item label="Bucket" value={player.auction_buckets?.name ?? "Unassigned"}/><Item label="Availability" value={AVAILABILITY_LABELS[player.availability_status]}/><Item label="Expected" value={formatMoney(player.expected_price)}/></dl><div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3"><Link href={`/teams/${teamId}/players/${player.id}`} className="team-primary min-h-11 rounded-xl px-3 py-3 text-center text-sm font-bold">View</Link>{canEdit ? <Link href={`/teams/${teamId}/players/${player.id}/edit`} className="min-h-11 rounded-xl border px-3 py-3 text-center text-sm font-bold text-slate-700">Edit</Link> : null}</div></article>)}</div>
    {!shown.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No players match these filters.</div> : null}
  </div>;
}

function Item({label,value}:{label:string;value:string}) { return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>; }
