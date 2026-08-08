"use client";

import { useState } from "react";

import type { AuctionBucket } from "@/types/planning";
import { PLAYER_ROLES, PRIORITY_LABELS } from "@/types/planning";

export function PlayerFilters({ buckets, values }: { buckets: AuctionBucket[]; values: Record<string, string | undefined> }) {
  const activeCount = [values.role, values.bucket, values.priority, values.availability, values.status && values.status !== "available" ? values.status : ""].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(activeCount > 0);
  const cls = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";
  return <form className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="player-pool-search">Search player name</label><input id="player-pool-search" name="search" defaultValue={values.search} placeholder="Search player name" className={`${cls} min-w-0 flex-1`} /><button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold">Filters{activeCount ? ` (${activeCount})` : ""}</button><button className="team-primary min-h-11 rounded-xl px-5 text-sm font-bold">Search</button></div>
    {!filtersOpen ? <>{["role", "bucket", "priority", "availability", "status"].map(name => <input key={name} type="hidden" name={name} value={values[name] ?? (name === "status" ? "available" : "")} />)}</> : null}
    {filtersOpen ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <select aria-label="Player role" name="role" defaultValue={values.role ?? ""} className={cls}><option value="">All roles</option>{PLAYER_ROLES.map(role => <option key={role}>{role}</option>)}</select>
      <select aria-label="Player bucket" name="bucket" defaultValue={values.bucket ?? ""} className={cls}><option value="">All buckets</option>{buckets.map(bucket => <option key={bucket.id} value={bucket.id}>{bucket.name}</option>)}</select>
      <select aria-label="Player priority" name="priority" defaultValue={values.priority ?? ""} className={cls}><option value="">All priorities</option>{Object.entries(PRIORITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Player availability" name="availability" defaultValue={values.availability ?? ""} className={cls}><option value="">All availability</option><option value="full">Full League</option><option value="partial">Partial</option><option value="unknown">Unknown</option></select>
      <select aria-label="Auction status" name="status" defaultValue={values.status ?? "available"} className={cls}><option value="available">Available</option><option value="my_team">My Team</option><option value="other_team">Other Team</option><option value="">All statuses</option></select>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className="team-primary min-h-11 rounded-xl px-5 text-sm font-bold">Apply filters</button><a href="?status=" className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Clear all</a></div>
    </div> : null}
  </form>;
}
