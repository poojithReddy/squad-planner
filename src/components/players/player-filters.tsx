import type { AuctionBucket } from "@/types/planning";
import { PLAYER_ROLES, PRIORITY_LABELS } from "@/types/planning";

export function PlayerFilters({ buckets, values }: { buckets: AuctionBucket[]; values: Record<string, string | undefined> }) {
  const cls = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";
  return <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
    <input name="search" defaultValue={values.search} placeholder="Search player name" className={`${cls} sm:col-span-2`} />
    <select name="role" defaultValue={values.role ?? ""} className={cls}><option value="">All roles</option>{PLAYER_ROLES.map(role => <option key={role}>{role}</option>)}</select>
    <select name="bucket" defaultValue={values.bucket ?? ""} className={cls}><option value="">All buckets</option>{buckets.map(bucket => <option key={bucket.id} value={bucket.id}>{bucket.name}</option>)}</select>
    <select name="priority" defaultValue={values.priority ?? ""} className={cls}><option value="">All priorities</option>{Object.entries(PRIORITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
    <select name="availability" defaultValue={values.availability ?? ""} className={cls}><option value="">All availability</option><option value="full">Full League</option><option value="partial">Partial</option><option value="unknown">Unknown</option></select>
    <select name="status" defaultValue={values.status ?? "available"} className={cls}><option value="available">Available</option><option value="my_team">My Team</option><option value="other_team">Other Team</option><option value="">All statuses</option></select>
    <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button className="min-h-11 rounded-xl bg-ink px-5 text-sm font-bold text-white">Apply filters</button><a href="?status=" className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Clear</a></div>
  </form>;
}
