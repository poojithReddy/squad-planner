import Link from "next/link";
import { BucketBudgetSummary } from "@/components/buckets/bucket-budget-summary";
import { BucketForm } from "@/components/buckets/bucket-form";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getBuckets, getPlayers } from "@/lib/planning/queries";
import { getAuthorisedTeam } from "@/lib/teams/queries";
import { formatMoney } from "@/types/planning";
import { createBucket, deleteBucket, moveBucket, updateBucket } from "./actions";

export default async function BucketsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const [{ canEdit }, team, buckets, players] = await Promise.all([requireTeamAccess(teamId), getAuthorisedTeam(teamId), getBuckets(teamId), getPlayers(teamId)]);
  if (!team) return null;
  const allocation = buckets.reduce((sum, bucket) => sum + bucket.planned_budget, 0);
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <TeamNav teamId={teamId} />
    <h1 className="text-3xl font-bold text-ink">Auction buckets</h1>
    <p className="mt-2 text-slate-500">Manage the team purse and custom planning groups separately.</p>
    <BucketBudgetSummary teamId={teamId} initialBudget={team.total_auction_budget} allocation={allocation} canEdit={canEdit} />
    {canEdit ? <section className="mt-7 rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">Create bucket</h2><div className="mt-5"><BucketForm action={createBucket.bind(null, teamId)} /></div></section> : null}
    <section className="mt-7 grid gap-4 lg:grid-cols-2">{buckets.map((bucket, index) => {
      const assigned = players.filter(player => player.bucket_id === bucket.id);
      const high = assigned.filter(player => player.priority === 1 || player.priority === 2).length;
      return <article key={bucket.id} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{bucket.name}</h2><p className="mt-1 text-sm text-slate-500">{bucket.description || "No description"}</p></div>{canEdit ? <div className="flex"><form action={moveBucket.bind(null, teamId, bucket.id, "up")}><button disabled={index === 0} aria-label={`Move ${bucket.name} up`} className="min-h-11 px-3 disabled:opacity-30">↑</button></form><form action={moveBucket.bind(null, teamId, bucket.id, "down")}><button disabled={index === buckets.length - 1} aria-label={`Move ${bucket.name} down`} className="min-h-11 px-3 disabled:opacity-30">↓</button></form></div> : null}</div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><SummaryItem label="Players in pool" value={String(assigned.length)} /><SummaryItem label="Required" value={`${bucket.minimum_players}–${bucket.maximum_players ?? "∞"}`} /><SummaryItem label="Planned budget" value={formatMoney(bucket.planned_budget)} /><SummaryItem label="High priority" value={String(high)} /></dl>
        <div className="mt-5 flex flex-wrap gap-2"><Link href={`/teams/${teamId}/players?bucket=${bucket.id}&status=`} className="min-h-11 rounded-xl border px-4 py-3 text-sm font-bold">View Players</Link>{canEdit ? <><Link href={`/teams/${teamId}/players/new?bucket=${bucket.id}`} className="min-h-11 rounded-xl border px-4 py-3 text-sm font-bold">Add Player</Link><Link href={`/teams/${teamId}/buckets/${bucket.id}/import`} className="team-primary min-h-11 rounded-xl px-4 py-3 text-sm font-bold">Upload Players</Link></> : null}</div>
        {canEdit ? <details className="mt-5 border-t pt-4"><summary className="team-accent-text cursor-pointer font-bold">Edit bucket</summary><div className="mt-4"><BucketForm compact bucket={bucket} action={updateBucket.bind(null, teamId, bucket.id)} /><form action={deleteBucket.bind(null, teamId, bucket.id)} className="mt-3"><button className="min-h-11 text-sm font-bold text-red-700">Delete bucket</button></form></div></details> : null}
      </article>;
    })}</section>
    {!buckets.length ? <div className="mt-7 rounded-2xl border border-dashed p-10 text-center text-slate-500">No buckets yet. Create your first auction bucket above.</div> : null}
  </div>;
}

function SummaryItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-bold text-slate-700">{value}</dd></div>; }
