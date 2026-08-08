"use client";

import { useMemo, useState } from "react";
import { addToPlan, movePlanPlayer, removeFromPlan } from "@/app/(protected)/teams/[teamId]/planning/actions";
import { filterPlanningPlayers } from "@/lib/planning/search";
import type { PlayerWithBucket } from "@/lib/planning/queries";
import type { AuctionBucket, ProbableSelection, ProbableTeam } from "@/types/planning";
import { AVAILABILITY_LABELS, formatMoney, PLAYER_ROLES, PRIORITY_LABELS } from "@/types/planning";

type PlanLabel = "A" | "B" | "C";

export function PlanningWorkspace({ teamId, teamBudget, players, buckets, plans, initialSelections, initialPlan, canEdit }: { teamId: string; teamBudget: number; players: PlayerWithBucket[]; buckets: AuctionBucket[]; plans: ProbableTeam[]; initialSelections: ProbableSelection[]; initialPlan: PlanLabel; canEdit: boolean }) {
  const [activePlan, setActivePlan] = useState<PlanLabel>(initialPlan);
  const [selections, setSelections] = useState(initialSelections);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState("");
  const [availability, setAvailability] = useState("");
  const allocation = buckets.reduce((sum, bucket) => sum + bucket.planned_budget, 0);
  const activePlanRow = plans.find(plan => plan.plan_label === activePlan);

  const selectedByPlan = useMemo(() => Object.fromEntries((["A", "B", "C"] as const).map(label => {
    const plan = plans.find(item => item.plan_label === label);
    return [label, plan ? selections.filter(selection => selection.probable_team_id === plan.id).sort((a, b) => a.display_order - b.display_order) : []];
  })) as Record<PlanLabel, ProbableSelection[]>, [plans, selections]);
  const selected = selectedByPlan[activePlan];
  const selectedIds = new Set(selected.map(selection => selection.player_id));
  const results = useMemo(() => filterPlanningPlayers(players, { query, bucketId, role, priority, availability }).slice(0, 30), [players, query, bucketId, role, priority, availability]);
  const estimates = Object.fromEntries((["A", "B", "C"] as const).map(label => [label, selectedByPlan[label].reduce((sum, selection) => sum + (players.find(player => player.id === selection.player_id)?.expected_price ?? 0), 0)])) as Record<PlanLabel, number>;

  function begin(key: string) { setPendingKeys(current => new Set(current).add(key)); setMessage(null); }
  function finish(key: string) { setPendingKeys(current => { const next = new Set(current); next.delete(key); return next; }); }

  async function add(playerId: string) {
    if (!activePlanRow || selectedIds.has(playerId)) return;
    const key = `add:${activePlan}:${playerId}`;
    if (pendingKeys.has(key)) return;
    const optimisticId = `optimistic-${activePlan}-${playerId}`;
    const optimistic: ProbableSelection = { id: optimisticId, team_id: teamId, probable_team_id: activePlanRow.id, player_id: playerId, display_order: selected.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    begin(key);
    setSelections(current => [...current, optimistic]);
    try {
      const result = await addToPlan(teamId, activePlanRow.id, playerId);
      if (!result.ok || !result.selection) {
        setSelections(current => current.filter(item => item.id !== optimisticId));
        setMessage({ kind: "error", text: result.ok ? "We couldn't add this player." : result.message });
      } else {
        setSelections(current => current.map(item => item.id === optimisticId ? result.selection! : item));
        setMessage({ kind: "success", text: `Player added to Plan ${activePlan}.` });
      }
    } catch {
      setSelections(current => current.filter(item => item.id !== optimisticId));
      setMessage({ kind: "error", text: "We couldn't add this player. Please try again." });
    } finally { finish(key); }
  }

  async function remove(selection: ProbableSelection) {
    const key = `remove:${selection.id}`;
    if (pendingKeys.has(key)) return;
    const previous = selections;
    begin(key);
    setSelections(current => current.filter(item => item.id !== selection.id));
    try {
      const result = await removeFromPlan(teamId, selection.id);
      if (!result.ok) { setSelections(previous); setMessage({ kind: "error", text: result.message }); }
      else setMessage({ kind: "success", text: `Player removed from Plan ${activePlan}.` });
    } catch {
      setSelections(previous);
      setMessage({ kind: "error", text: "We couldn't remove this player. Please try again." });
    } finally { finish(key); }
  }

  async function move(selection: ProbableSelection, direction: "up" | "down") {
    const key = `move:${selection.id}`;
    if (pendingKeys.has(key)) return;
    const previous = selections;
    const ordered = selectedByPlan[activePlan];
    const index = ordered.findIndex(item => item.id === selection.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const reordered = [...ordered];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const orderMap = new Map(reordered.map((item, order) => [item.id, order]));
    begin(key);
    setSelections(current => current.map(item => orderMap.has(item.id) ? { ...item, display_order: orderMap.get(item.id)! } : item));
    try {
      const result = await movePlanPlayer(teamId, selection.id, direction);
      if (!result.ok) { setSelections(previous); setMessage({ kind: "error", text: result.message }); }
    } catch {
      setSelections(previous);
      setMessage({ kind: "error", text: "We couldn't reorder this plan. Please try again." });
    } finally { finish(key); }
  }

  return <>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Kpi label="Team budget" value={teamBudget > 0 ? formatMoney(teamBudget) : "Not configured"} />
      <Kpi label="Bucket budget" value={formatMoney(allocation)} warning={teamBudget > 0 && allocation > teamBudget} />
      {(["A", "B", "C"] as const).map(label => <Kpi key={label} label={`Plan ${label} estimate`} value={formatMoney(estimates[label])} warning={teamBudget > 0 && estimates[label] > teamBudget} />)}
    </section>
    <nav className="mt-7 grid grid-cols-3 gap-2 sm:flex" aria-label="Probable plans">{(["A", "B", "C"] as const).map(label => <button key={label} onClick={() => { setActivePlan(label); setMessage(null); }} aria-current={activePlan === label ? "page" : undefined} className={`min-h-11 rounded-xl border px-5 py-3 text-sm font-bold ${activePlan === label ? "team-soft" : "border-slate-200 bg-white text-slate-600"}`}>Plan {label}<span className="ml-1 text-xs">({selectedByPlan[label].length})</span></button>)}</nav>
    {message ? <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${message.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message.text}</p> : null}
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <section className="order-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-1">
        <div className="flex items-center justify-between gap-3"><div><p className="team-accent-text text-xs font-bold uppercase">Current shortlist</p><h2 className="text-xl font-bold">Plan {activePlan}</h2></div><span className="text-sm font-semibold text-slate-500">{selected.length} selected · {formatMoney(estimates[activePlan])}</span></div>
        <div className="mt-4 space-y-3">{selected.map((selection, index) => { const player = players.find(item => item.id === selection.player_id); if (!player) return null; const moving = pendingKeys.has(`move:${selection.id}`), removing = pendingKeys.has(`remove:${selection.id}`); return <article key={selection.id} className={`rounded-xl border border-slate-200 p-4 ${selection.id.startsWith("optimistic-") ? "team-soft" : "bg-white"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-ink">{index + 1}. {player.name}</p><p className="mt-1 text-sm text-slate-500">{player.role ?? "Role not set"} · {player.auction_buckets?.name ?? "Unassigned"}</p><p className="mt-2 text-sm">{player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"} · {AVAILABILITY_LABELS[player.availability_status]} · Expected {formatMoney(player.expected_price)}</p></div>{canEdit ? <div className="flex shrink-0 items-center"><button disabled={index === 0 || moving || removing || selection.id.startsWith("optimistic-")} onClick={() => move(selection, "up")} aria-label={`Move ${player.name} up`} className="min-h-11 px-3 disabled:opacity-30">↑</button><button disabled={index === selected.length - 1 || moving || removing || selection.id.startsWith("optimistic-")} onClick={() => move(selection, "down")} aria-label={`Move ${player.name} down`} className="min-h-11 px-3 disabled:opacity-30">↓</button><button disabled={moving || removing || selection.id.startsWith("optimistic-")} onClick={() => remove(selection)} className="min-h-11 px-3 text-sm font-bold text-red-700 disabled:opacity-50">{removing ? "Removing..." : "Remove"}</button></div> : null}</div></article>; })}
          {!selected.length ? <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-semibold text-slate-700">No players added to Plan {activePlan} yet.</p><p className="mt-2 text-sm text-slate-500">Search for a player to start building this plan.</p></div> : null}
        </div>
      </section>
      <section className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-2">
        <p className="team-accent-text text-xs font-bold uppercase">Find a player</p><h2 className="text-xl font-bold">Add to Plan {activePlan}</h2><p className="mt-1 text-sm text-slate-500">Search updates as you type. Players can belong to more than one plan.</p>
        <label className="mt-4 block text-sm font-bold">Player name<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search player name" autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[var(--team-primary)] focus:ring-2 focus:ring-[var(--team-focus)]" /></label>
        <div className="mt-3 grid grid-cols-2 gap-2"><Select label="Bucket" value={bucketId} set={setBucketId} options={buckets.map(bucket => [bucket.id, bucket.name])} /><Select label="Role" value={role} set={setRole} options={PLAYER_ROLES.map(value => [value, value])} /><Select label="Priority" value={priority} set={setPriority} options={Object.entries(PRIORITY_LABELS)} /><Select label="Availability" value={availability} set={setAvailability} options={Object.entries(AVAILABILITY_LABELS)} /></div>
        <div className="mt-4 max-h-[38rem] space-y-2 overflow-y-auto">{results.map(player => { const memberships = (["A", "B", "C"] as const).filter(label => selectedByPlan[label].some(selection => selection.player_id === player.id)); const already = selectedIds.has(player.id); const adding = pendingKeys.has(`add:${activePlan}:${player.id}`); return <article key={player.id} className="rounded-xl border bg-slate-50 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><strong>{player.name}</strong><p className="mt-1 text-xs text-slate-500">{player.role ?? "No role"} · {player.auction_buckets?.name ?? "Unassigned"}</p><p className="mt-1 text-xs text-slate-600">{player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"} · {AVAILABILITY_LABELS[player.availability_status]} · Expected {formatMoney(player.expected_price)}</p><div className="mt-2 flex flex-wrap gap-1">{memberships.length ? memberships.map(label => <span key={label} className="team-soft rounded-full border px-2 py-1 text-[10px] font-bold">Plan {label}</span>) : <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">No Plan</span>}</div></div>{canEdit ? already ? <span className="team-soft rounded-xl border px-3 py-3 text-center text-xs font-bold">✓ In Plan {activePlan}</span> : <button disabled={adding} onClick={() => add(player.id)} className="team-primary min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{adding ? "Adding..." : `Add to Plan ${activePlan}`}</button> : null}</div></article>; })}{!results.length ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">No players match this search.</p> : null}</div>
      </section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Availability overview</h2>{(["full", "partial", "unknown"] as const).map(status => <div key={status} className="mt-3 flex justify-between text-sm"><span>{AVAILABILITY_LABELS[status]}</span><strong>{players.filter(player => player.availability_status === status).length}</strong></div>)}</section><section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Bucket overview</h2>{buckets.map(bucket => <div key={bucket.id} className="mt-3 flex justify-between gap-3 text-sm"><span>{bucket.name}</span><strong>{players.filter(player => player.bucket_id === bucket.id).length} / {bucket.minimum_players}–{bucket.maximum_players ?? "∞"}</strong></div>)}</section></div>
  </>;
}

function Select({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: readonly (readonly [string, string])[] }) { return <label className="text-xs font-bold text-slate-600">{label}<select value={value} onChange={event => set(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2 text-sm"><option value="">All {label.toLowerCase()}</option>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>; }
function Kpi({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={`rounded-2xl border p-4 ${warning ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p>{warning ? <p className="mt-1 text-xs font-semibold text-amber-700">Over budget plan</p> : null}</div>; }
