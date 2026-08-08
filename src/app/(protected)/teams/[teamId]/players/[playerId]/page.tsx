import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getBuckets, getPlayer } from "@/lib/planning/queries";
import { AUCTION_STATUS_LABELS, AVAILABILITY_LABELS, formatMoney, PRIORITY_LABELS } from "@/types/planning";

export default async function ViewPlayerPage({ params }: { params: Promise<{ teamId: string; playerId: string }> }) {
  const { teamId, playerId } = await params;
  const [{ canEdit }, buckets, player] = await Promise.all([requireTeamAccess(teamId), getBuckets(teamId), getPlayer(teamId, playerId)]);
  if (!player) notFound();
  const bucket = buckets.find(item => item.id === player.bucket_id);

  return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <TeamNav teamId={teamId} />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href={`/teams/${teamId}/players`} className="text-sm font-bold text-slate-500 hover:text-ink">← Back to player pool</Link><p className="team-accent-text mt-5 text-xs font-bold uppercase">Player details</p><h1 className="mt-1 text-3xl font-black text-ink">{player.name}</h1><p className="mt-2 text-sm text-slate-500">Read-only auction planning and imported player information.</p></div>{canEdit ? <Link href={`/teams/${teamId}/players/${playerId}/edit`} className="team-primary min-h-11 rounded-xl px-5 py-3 text-center text-sm font-bold">Edit player</Link> : null}</div>

    <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap gap-2"><Badge>{AUCTION_STATUS_LABELS[player.auction_status]}</Badge>{bucket ? <Badge>{bucket.name}</Badge> : null}</div>
      <dl className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        <Detail label="Role" value={player.role ?? "Not set"} />
        <Detail label="Bucket" value={bucket?.name ?? "Unassigned"} />
        <Detail label="Priority" value={player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"} />
        <Detail label="Expected price" value={formatMoney(player.expected_price)} />
        <Detail label="Availability" value={AVAILABILITY_LABELS[player.availability_status]} />
        <Detail label="Available matches" value={player.available_matches === null ? "Not specified" : String(player.available_matches)} />
        <Detail label="Auction status" value={AUCTION_STATUS_LABELS[player.auction_status]} />
        <Detail label="Sold price" value={formatMoney(player.sold_price)} />
      </dl>
    </section>

    <section className="mt-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-black">Career / Imported Stats</h2><p className="mt-1 text-sm text-slate-500">Imported summary information, separate from Squad Planner match appearances.</p><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Matches" value={player.matches} /><Stat label="Batting" value={player.batting_score} /><Stat label="Wickets" value={player.bowling_wickets} /><Stat label="Catches" value={player.catches} /></dl></section>

    <section className="mt-5 grid gap-5 md:grid-cols-2"><TextSection title="Availability notes" value={player.availability_notes} /><TextSection title="Player notes" value={player.notes} /></section>
  </div>;
}

function Badge({ children }: { children: React.ReactNode }) { return <span className="team-soft rounded-full border px-3 py-1 text-xs font-bold">{children}</span>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-4 text-center"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-black">{value}</dd></div>; }
function TextSection({ title, value }: { title: string; value: string | null }) { return <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="font-black">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value || "No notes added."}</p></section>; }
