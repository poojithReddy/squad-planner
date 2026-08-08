"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { changeAuctionLifecycle, changeAuctionStatus } from "@/app/(protected)/teams/[teamId]/auction/actions";
import {
  auctionTotals,
  bucketProgress,
  filterPlayersByPlan,
  planAuctionProgress,
  planLabelsForPlayer,
  rankRecommendations,
  type PlanFilter,
} from "@/lib/auction/calculations";
import { createClient } from "@/lib/supabase/client";
import type { AuctionFilterStatus, AuctionPlayer, AuctionSnapshot, Recommendation } from "@/types/auction";
import type { AuctionLifecycle, AuctionStatus } from "@/types/database";
import { AVAILABILITY_LABELS, formatMoney, PLAYER_ROLES, PRIORITY_LABELS } from "@/types/planning";

type MobileTab = "auction" | "plans" | "squad";
type PlanLabel = "A" | "B" | "C";

export function LiveAuction({ initial }: { initial: AuctionSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AuctionFilterStatus>("available");
  const [bucket, setBucket] = useState("");
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState("");
  const [availability, setAvailability] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [activePlan, setActivePlan] = useState<PlanLabel>("A");
  const [tab, setTab] = useState<MobileTab>("auction");
  const [plansOpen, setPlansOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction:${initial.team.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "players", filter: `team_id=eq.${initial.team.id}` }, payload => {
        setSnapshot(current => ({ ...current, players: current.players.map(player => player.id === payload.new.id ? { ...player, ...payload.new } : player) }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_history", filter: `team_id=eq.${initial.team.id}` }, payload => {
        setSnapshot(current => ({ ...current, history: [payload.new as typeof current.history[number], ...current.history].slice(0, 40) }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "teams", filter: `id=eq.${initial.team.id}` }, payload => {
        setSnapshot(current => ({ ...current, team: { ...current.team, auction_status: payload.new.auction_status as AuctionLifecycle } }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [initial.team.id]);

  useEffect(() => {
    if (!plansOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPlansOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [plansOpen]);

  const selected = snapshot.players.find(player => player.id === selectedId) ?? null;
  const totals = auctionTotals(snapshot);
  const progress = bucketProgress(snapshot);
  const recommendations = rankRecommendations(snapshot);
  const canDecide = snapshot.canEdit && snapshot.team.auction_status !== "completed";
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const candidates = filterPlayersByPlan(snapshot, snapshot.players.filter(player =>
      (!query || player.name.toLocaleLowerCase().includes(query)) &&
      (!bucket || player.bucket_id === bucket) &&
      (!role || player.role === role) &&
      (!priority || player.priority === Number(priority)) &&
      (!availability || player.availability_status === availability) &&
      (status === "all" || player.auction_status === status)
    ), planFilter);
    return [...candidates].sort((a, b) => {
      if (!query) return a.name.localeCompare(b.name);
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      const aStarts = aName.startsWith(query) ? 0 : 1;
      const bStarts = bName.startsWith(query) ? 0 : 1;
      return aStarts - bStarts || aName.indexOf(query) - bName.indexOf(query) || a.name.localeCompare(b.name);
    });
  }, [snapshot, search, bucket, role, priority, availability, status, planFilter]);

  function clearFilters() {
    setSearch(""); setBucket(""); setRole(""); setPriority(""); setAvailability(""); setStatus("available"); setPlanFilter("all");
  }

  function selectPlayer(id: string) {
    setSelectedId(id);
    setTab("auction");
    setPlansOpen(false);
    requestAnimationFrame(() => {
      selectedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      selectedSectionRef.current?.focus({ preventScroll: true });
    });
  }

  function decide(player: AuctionPlayer, next: AuctionStatus, price = 0) {
    if (!canDecide) { setMessage("Reopen the auction before changing player decisions."); return; }
    let squadOverride = false;
    let bucketOverride = false;
    if (next === "my_team") {
      if (totals.squad.length >= snapshot.team.squad_size) {
        squadOverride = window.confirm(`Squad limit of ${snapshot.team.squad_size} is reached. Continue anyway?`);
        if (!squadOverride) return;
      }
      const item = progress.find(entry => entry.bucket.id === player.bucket_id);
      if (item?.bucket.maximum_players !== null && item && item.count >= item.bucket.maximum_players) {
        bucketOverride = window.confirm(`This bucket is already at its planned maximum of ${item.bucket.maximum_players} players. Continue anyway?`);
        if (!bucketOverride) return;
      }
    }
    setMessage("");
    startTransition(async () => {
      const result = await changeAuctionStatus(snapshot.team.id, player.id, player.auction_status, next, price, squadOverride, bucketOverride);
      if (result.ok && result.player) {
        setSnapshot(current => ({ ...current, players: current.players.map(item => item.id === player.id ? { ...item, ...result.player } : item) }));
        setMessage(next === "available" ? `${player.name} returned to Available.` : "Auction decision saved.");
      } else {
        setMessage(result.message ?? "Unable to save the auction decision.");
        if (result.code === "conflict") window.location.reload();
      }
    });
  }

  function undo(player: AuctionPlayer) {
    if (window.confirm(`Remove ${player.name} from your squad and return this player to Available?`)) decide(player, "available", 0);
  }

  function lifecycle(next: AuctionLifecycle) {
    const prompt = next === "completed" ? "Complete the auction? You can reopen it later." : next === "live" ? "Start or reopen the live auction?" : "Return this auction to planning?";
    if (!window.confirm(prompt)) return;
    startTransition(async () => {
      const result = await changeAuctionLifecycle(snapshot.team.id, snapshot.team.auction_status, next);
      if (result.ok && result.status) setSnapshot(current => ({ ...current, team: { ...current.team, auction_status: result.status } }));
      else setMessage(result.message ?? "Unable to update lifecycle.");
    });
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <AuctionHeader snapshot={snapshot} />
      <div className="mx-auto max-w-[120rem] px-3 py-4 sm:px-5 lg:px-6">
        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden" role="tablist" aria-label="Auction workspace">
          {(["auction", "plans", "squad"] as const).map(value => (
            <button key={value} role="tab" onClick={() => setTab(value)} aria-selected={tab === value} className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-bold capitalize ${tab === value ? "team-soft" : "bg-white text-slate-600"}`}>
              {value === "squad" ? "My Squad" : value}
            </button>
          ))}
        </div>
        <div className="mb-4 hidden items-center justify-between md:flex xl:hidden">
          <p className="text-sm font-semibold text-slate-600">Auction workspace</p>
          <button type="button" onClick={() => setPlansOpen(true)} className="team-soft min-h-11 rounded-xl border px-4 font-bold" aria-haspopup="dialog">Open Plans</button>
        </div>
        {message ? <p role="status" className="mb-4 rounded-xl border bg-white px-4 py-3 text-sm font-semibold">{message}</p> : null}
        {snapshot.team.auction_status === "completed" ? <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">Auction completed. Owner or captain must reopen it before decisions can be changed.</p> : null}

        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.85fr)] xl:grid-cols-[minmax(16rem,25fr)_minmax(30rem,45fr)_minmax(21rem,30fr)]">
          <aside className="hidden min-w-0 xl:block">
            <PlansPanel snapshot={snapshot} active={activePlan} onPlan={setActivePlan} onPlayer={selectPlayer} />
          </aside>

          <main className={`${tab !== "auction" ? "hidden md:block" : ""} min-w-0 space-y-4`}>
            <PlayerSearch
              snapshot={snapshot}
              players={filtered}
              values={{ search, bucket, role, priority, availability, status, planFilter }}
              setters={{ setSearch, setBucket, setRole, setPriority, setAvailability, setStatus, setPlanFilter }}
              selectedId={selectedId}
              activeResult={activeResult}
              setActiveResult={setActiveResult}
              onSelect={selectPlayer}
              clear={clearFilters}
            />
            <section ref={selectedSectionRef} tabIndex={-1} className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--team-focus)]">
              {selected ? <ActionPanel snapshot={snapshot} player={selected} canEdit={canDecide} completed={snapshot.team.auction_status === "completed"} pending={pending} onClose={() => setSelectedId(null)} onDecide={decide} /> : <EmptyAction snapshot={snapshot} recommendation={recommendations[0]} onSelect={selectPlayer} />}
            </section>
            <RecommendationPanel snapshot={snapshot} recommendations={recommendations} onSelect={selectPlayer} />
          </main>

          <aside className={`${tab !== "squad" ? "hidden md:block" : ""} min-w-0 space-y-4`}>
            <SquadPanel snapshot={snapshot} canUndo={canDecide} pending={pending} onUndo={undo} />
            <HistoryPanel snapshot={snapshot} />
          </aside>

          {tab === "plans" ? <div className="min-w-0 md:hidden"><PlansPanel snapshot={snapshot} active={activePlan} onPlan={setActivePlan} onPlayer={selectPlayer} /></div> : null}
        </div>

        {snapshot.canControlLifecycle ? <div className="mt-5 flex flex-wrap gap-2">
          {snapshot.team.auction_status !== "live" ? <button disabled={pending} onClick={() => lifecycle("live")} className="team-primary min-h-11 rounded-xl px-5 font-bold">{snapshot.team.auction_status === "completed" ? "Reopen Auction" : "Start Live Auction"}</button> : <button disabled={pending} onClick={() => lifecycle("completed")} className="min-h-11 rounded-xl bg-ink px-5 font-bold text-white">Complete Auction</button>}
          {snapshot.team.auction_status !== "planning" ? <button disabled={pending} onClick={() => lifecycle("planning")} className="min-h-11 rounded-xl border bg-white px-5 font-bold">Return to Planning</button> : null}
        </div> : null}
      </div>

      {plansOpen ? <div className="fixed inset-0 z-[70] hidden xl:hidden md:block" role="dialog" aria-modal="true" aria-label="Pre-auction plans">
        <button className="absolute inset-0 bg-slate-950/45" onClick={() => setPlansOpen(false)} aria-label="Close plans" />
        <div className="absolute inset-y-0 left-0 w-[min(26rem,88vw)] overflow-y-auto bg-canvas p-4 shadow-2xl">
          <div className="mb-3 flex justify-end"><button autoFocus onClick={() => setPlansOpen(false)} className="min-h-11 rounded-xl border bg-white px-4 font-bold" aria-label="Close plans panel">Close</button></div>
          <PlansPanel snapshot={snapshot} active={activePlan} onPlan={setActivePlan} onPlayer={selectPlayer} />
        </div>
      </div> : null}
    </div>
  );
}

function AuctionHeader({ snapshot }: { snapshot: AuctionSnapshot }) {
  const totals = auctionTotals(snapshot);
  return <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[120rem] items-center gap-3 px-4 py-3 sm:gap-5">
    <div className="min-w-0 flex-1"><p className="truncate text-lg font-black">{snapshot.team.name}</p><p className="team-accent-text text-xs font-bold uppercase">Auction {snapshot.team.auction_status}</p></div>
    <Metric label="Squad" value={`${totals.squad.length}/${snapshot.team.squad_size}`} />
    <Metric label="Spent" value={formatMoney(totals.spent)} />
    {snapshot.team.total_auction_budget > 0 ? <Metric label="Remaining" value={formatMoney(totals.remaining)} warning={totals.remaining < 0} /> : <Metric label="Budget" value="Not configured" />}
    <Metric label="Slots" value={String(totals.slotsLeft)} />
  </div></header>;
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className="hidden text-right sm:block"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className={`text-sm font-black ${warning ? "text-red-700" : "text-ink"}`}>{value}</p></div>;
}

type SearchValues = { search: string; bucket: string; role: string; priority: string; availability: string; status: AuctionFilterStatus; planFilter: PlanFilter };
type SearchSetters = { setSearch: (value: string) => void; setBucket: (value: string) => void; setRole: (value: string) => void; setPriority: (value: string) => void; setAvailability: (value: string) => void; setStatus: (value: AuctionFilterStatus) => void; setPlanFilter: (value: PlanFilter) => void };

function PlayerSearch({ snapshot, players, values, setters, selectedId, activeResult, setActiveResult, onSelect, clear }: { snapshot: AuctionSnapshot; players: AuctionPlayer[]; values: SearchValues; setters: SearchSetters; selectedId: string | null; activeResult: number; setActiveResult: (value: number) => void; onSelect: (id: string) => void; clear: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasSearch = values.search.trim().length > 0;
  const hasActiveFilters = Boolean(values.bucket || values.role || values.priority || values.availability || values.planFilter !== "all" || values.status !== "available");
  const shouldShowResults = resultsOpen && (hasSearch || showAll || hasActiveFilters);
  const visiblePlayers = shouldShowResults ? players : [];
  const safeActiveResult = Math.min(activeResult, Math.max(0, visiblePlayers.length - 1));

  function selectPlayer(id: string) {
    onSelect(id);
    setResultsOpen(false);
    setShowAll(false);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setActiveResult(0);
    setResultsOpen(true);
  }

  function clearSearchAndFilters() {
    clear();
    setActiveResult(0);
    setShowAll(false);
    setResultsOpen(false);
  }

  function keyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visiblePlayers.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult(Math.min(visiblePlayers.length - 1, safeActiveResult + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult(Math.max(0, safeActiveResult - 1)); }
    if (event.key === "Enter") { event.preventDefault(); selectPlayer(visiblePlayers[safeActiveResult]?.id ?? visiblePlayers[0].id); }
    if (event.key === "Escape") { setResultsOpen(false); setShowAll(false); }
  }
  return <section className="min-w-0 rounded-2xl border bg-white shadow-sm">
    <div className="border-b p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3"><div><p className="team-accent-text text-xs font-bold uppercase">Player Search & Actions</p><h2 className="text-xl font-black">Find the player on auction</h2></div><span className="text-sm font-semibold text-slate-500">{players.length} players</span></div>
      <label className="mt-4 block text-sm font-bold" htmlFor="auction-player-search">Search player name</label>
      <input id="auction-player-search" value={values.search} onFocus={() => { if (hasSearch || hasActiveFilters) setResultsOpen(true); }} onChange={event => { const value = event.target.value; setters.setSearch(value); setActiveResult(0); setShowAll(false); setResultsOpen(value.trim().length > 0); }} onKeyDown={keyDown} placeholder="Start typing a player name" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={shouldShowResults && visiblePlayers.length > 0} aria-controls="auction-search-results" aria-activedescendant={visiblePlayers[safeActiveResult] ? `auction-result-${visiblePlayers[safeActiveResult].id}` : undefined} className="mt-2 min-h-14 w-full rounded-xl border-2 px-4 text-base font-semibold shadow-sm outline-none focus:border-[var(--team-primary)] focus:ring-2 focus:ring-[var(--team-focus)]" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setShowAll(value => !value); setResultsOpen(!showAll); setActiveResult(0); }} className="team-soft min-h-10 rounded-xl border px-3 text-sm font-bold">{showAll && resultsOpen ? "Hide player list" : `Show all players (${players.length})`}</button>
        <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)} className="min-h-10 rounded-xl border bg-white px-3 text-sm font-bold">Filters{hasActiveFilters ? " • Active" : ""}</button>
        {(hasSearch || hasActiveFilters) ? <button type="button" onClick={clearSearchAndFilters} className="min-h-10 px-2 text-sm font-bold text-slate-500 underline-offset-4 hover:underline">Clear</button> : null}
      </div>
      {filtersOpen ? <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Filter value={values.bucket} onChange={value => changeFilter(setters.setBucket, value)} label="All buckets" options={snapshot.buckets.map(item => [item.id, item.name])} />
        <Filter value={values.role} onChange={value => changeFilter(setters.setRole, value)} label="All roles" options={PLAYER_ROLES.map(item => [item, item])} />
        <Filter value={values.priority} onChange={value => changeFilter(setters.setPriority, value)} label="All priorities" options={Object.entries(PRIORITY_LABELS)} />
        <Filter value={values.availability} onChange={value => changeFilter(setters.setAvailability, value)} label="All availability" options={Object.entries(AVAILABILITY_LABELS)} />
        <Filter value={values.status} onChange={value => changeFilter(value => setters.setStatus(value as AuctionFilterStatus), value)} label="Auction status" options={[["available", "Available"], ["my_team", "My Team"], ["other_team", "Other Team"], ["all", "All statuses"]]} noEmpty />
        <Filter value={values.planFilter} onChange={value => changeFilter(value => setters.setPlanFilter(value as PlanFilter), value)} label="All players" options={[["A", "Plan A"], ["B", "Plan B"], ["C", "Plan C"], ["none", "Not in a Plan"]]} />
      </div> : null}
    </div>
    {shouldShowResults ? <div id="auction-search-results" role="listbox" aria-label="Auction player results" className="max-h-[20rem] space-y-2 overflow-y-auto p-3 sm:p-4">
      {visiblePlayers.map((player, index) => <PlayerResult key={player.id} snapshot={snapshot} player={player} selected={player.id === selectedId} active={index === safeActiveResult} onSelect={() => selectPlayer(player.id)} />)}
      {!visiblePlayers.length ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No players match the current search and filters.</div> : null}
    </div> : <div className="p-4 text-center text-sm text-slate-500">Start typing a player name, or choose <strong>Show all players</strong>.</div>}
  </section>;
}

function Filter({ value, onChange, label, options, noEmpty = false }: { value: string; onChange: (value: string) => void; label: string; options: readonly (readonly [string, string])[]; noEmpty?: boolean }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="min-h-11 min-w-0 rounded-xl border px-2 text-sm">{!noEmpty ? <option value="">{label}</option> : null}{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>;
}

function PlayerResult({ snapshot, player, selected, active, onSelect }: { snapshot: AuctionSnapshot; player: AuctionPlayer; selected: boolean; active: boolean; onSelect: () => void }) {
  const plans = planLabelsForPlayer(snapshot, player.id);
  const state = player.auction_status === "my_team" ? "border-emerald-300 bg-emerald-50" : player.auction_status === "other_team" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white";
  return <button id={`auction-result-${player.id}`} role="option" aria-selected={selected} onClick={onSelect} className={`min-h-20 w-full rounded-xl border p-3 text-left transition ${state} ${selected || active ? "ring-2 ring-[var(--team-primary)]" : "hover:border-slate-400"}`}>
    <div className="flex items-start justify-between gap-3"><span className="font-bold">{player.name}</span><Status status={player.auction_status} /></div>
    <p className="mt-1 text-xs text-slate-500">{player.role ?? "No role"} · {player.bucketName ?? "Unassigned"} · {AVAILABILITY_LABELS[player.availability_status]}</p>
    <div className="mt-2 flex flex-wrap gap-1">{plans.length ? plans.map(plan => <PlanBadge key={plan} label={plan} />) : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">No Plan</span>}</div>
  </button>;
}

function Status({ status }: { status: AuctionStatus }) {
  return <span className={`shrink-0 text-xs font-bold ${status === "my_team" ? "text-emerald-700" : status === "other_team" ? "text-red-700" : "text-slate-600"}`}>{status === "my_team" ? "✓ Secured" : status === "other_team" ? "✕ Lost" : "○ Available"}</span>;
}

function PlanBadge({ label }: { label: string }) {
  return <span className="team-soft rounded-full border px-2 py-1 text-[10px] font-black uppercase">Plan {label}</span>;
}

function ActionPanel({ snapshot, player, canEdit, completed, pending, onClose, onDecide }: { snapshot: AuctionSnapshot; player: AuctionPlayer; canEdit: boolean; completed: boolean; pending: boolean; onClose: () => void; onDecide: (player: AuctionPlayer, status: AuctionStatus, price?: number) => void }) {
  const [price, setPrice] = useState("0");
  const [buying, setBuying] = useState(false);
  const plans = planLabelsForPlayer(snapshot, player.id);
  return <div>
    <div className="flex items-start justify-between gap-3"><div><p className="team-accent-text text-xs font-bold uppercase">Selected Player</p><h2 className="mt-1 text-2xl font-black">{player.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2">{plans.length ? plans.map(plan => <PlanBadge key={plan} label={plan} />) : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">No Plan</span>}<Status status={player.auction_status} /></div></div><button type="button" onClick={onClose} className="min-h-10 shrink-0 rounded-xl border bg-white px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Clear selection</button></div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
      <Info label="Role" value={player.role ?? "Not set"} />
      <Info label="Bucket" value={player.bucketName ?? "Unassigned"} />
      <Info label="Availability" value={`${AVAILABILITY_LABELS[player.availability_status]}${player.availability_status === "partial" && player.available_matches !== null ? ` · ${player.available_matches} matches` : ""}`} />
      <Info label="Expected price" value={formatMoney(player.expected_price)} />
    </dl>
    <details className="mt-4 rounded-xl border bg-slate-50/70 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-600">View player details</summary><div className="mt-3"><Info label="Priority" value={player.priority ? PRIORITY_LABELS[player.priority] : "Not ranked"} /><div className="mt-3"><Info label="Notes" value={player.notes ?? "No notes"} /></div><h3 className="mt-4 text-xs font-bold uppercase text-slate-400">Career / Imported Stats</h3><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Matches" value={player.matches} /><Stat label="Batting" value={player.batting_score} /><Stat label="Wickets" value={player.bowling_wickets} /><Stat label="Catches" value={player.catches} /></div></div></details>
    {completed ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">Reopen the auction to edit this decision.</p> : !canEdit ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm font-semibold">Read-only auction access</p> : player.auction_status === "available" ? <div className="mt-6 space-y-3">
      {buying ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><label className="text-sm font-bold">Sold Price<input autoFocus value={price} onChange={event => setPrice(event.target.value)} type="number" min="0" step="0.01" className="mt-2 min-h-12 w-full rounded-xl border px-3" /></label><div className="mt-3 flex gap-2"><button disabled={pending || Number(price) < 0} onClick={() => onDecide(player, "my_team", Number(price))} className="min-h-12 flex-1 rounded-xl bg-emerald-700 font-bold text-white hover:bg-emerald-800">Confirm Purchase</button><button onClick={() => setBuying(false)} className="min-h-12 rounded-xl border bg-white px-4 font-bold">Cancel</button></div></div> : <button disabled={pending} onClick={() => { setPrice("0"); setBuying(true); }} className="min-h-12 w-full rounded-xl bg-emerald-700 font-bold text-white hover:bg-emerald-800">Sold to My Team</button>}
      <button disabled={pending} onClick={() => onDecide(player, "other_team", 0)} className="min-h-12 w-full rounded-xl border border-red-300 bg-red-50 font-bold text-red-800">Sold to Other Team</button>
    </div> : <button disabled={pending} onClick={() => window.confirm(player.auction_status === "my_team" ? `Remove ${player.name} from your squad and return this player to Available?` : `Return ${player.name} to Available?`) && onDecide(player, "available", 0)} className="mt-6 min-h-12 w-full rounded-xl border border-amber-300 bg-amber-50 font-bold text-amber-900">{player.auction_status === "my_team" ? "Undo Pick" : "Undo Decision"}</button>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-lg font-black">{value}</p><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p></div>; }

function EmptyAction({ snapshot, recommendation, onSelect }: { snapshot: AuctionSnapshot; recommendation: Recommendation | undefined; onSelect: (id: string) => void }) {
  const plans = recommendation ? planLabelsForPlayer(snapshot, recommendation.player.id) : [];
  return <div className="grid min-h-44 place-items-center text-center"><div><p className="font-bold text-slate-500">Select a player to open auction actions.</p>{recommendation ? <button onClick={() => onSelect(recommendation.player.id)} className="team-accent-text mt-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[var(--team-primary-soft)]">Recommended next: {recommendation.player.name} · {plans.length ? `Plan ${plans.join(" + Plan ")}` : "No Plan"}</button> : null}</div></div>;
}

function RecommendationPanel({ snapshot, recommendations, onSelect }: { snapshot: AuctionSnapshot; recommendations: Recommendation[]; onSelect: (id: string) => void }) {
  const top = recommendations[0];
  if (!top) return null;
  const plans = planLabelsForPlayer(snapshot, top.player.id);
  return <section className="team-border rounded-2xl border bg-white p-5 shadow-sm">
    <p className="team-accent-text text-xs font-bold uppercase">Recommended Next Target</p>
    <button onClick={() => onSelect(top.player.id)} className="mt-1 text-left text-xl font-black underline-offset-4 hover:underline">{top.player.name}</button>
    <div className="mt-2 flex flex-wrap items-center gap-2">{plans.length ? plans.map(plan => <PlanBadge key={plan} label={plan} />) : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">No Plan</span>}<span className="text-xs font-semibold text-slate-500">{top.player.bucketName ?? "Unassigned"} · {AVAILABILITY_LABELS[top.player.availability_status]}</span></div>
    {top.budgetRisk ? <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Budget Risk</span> : null}
    <ul className="mt-3 space-y-1 text-sm text-slate-600">{top.reasons.slice(0, 4).map(reason => <li key={reason}>• {reason}</li>)}</ul>
  </section>;
}

function SquadPanel({ snapshot, canUndo, pending, onUndo }: { snapshot: AuctionSnapshot; canUndo: boolean; pending: boolean; onUndo: (player: AuctionPlayer) => void }) {
  const totals = auctionTotals(snapshot);
  const progress = bucketProgress(snapshot);
  const groups = [...progress.filter(item => item.won.length).map(item => ({ key: item.bucket.id, name: item.bucket.name, min: item.bucket.minimum_players, max: item.bucket.maximum_players, players: item.won }))];
  const unassigned = totals.squad.filter(player => !player.bucket_id);
  if (unassigned.length) groups.push({ key: "unassigned", name: "Unassigned", min: 0, max: null, players: unassigned });
  return <section className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="team-accent-text text-xs font-bold uppercase">My Live Squad</p><h2 className="text-2xl font-black">{totals.squad.length} / {snapshot.team.squad_size}</h2><p className="text-xs font-semibold text-slate-500">{totals.slotsLeft} remaining squad slots</p></div><div className="text-right text-xs"><p className="font-bold">Spent {formatMoney(totals.spent)}</p>{snapshot.team.total_auction_budget > 0 ? <p className={totals.remaining < 0 ? "font-bold text-red-700" : "text-slate-500"}>Remaining {formatMoney(totals.remaining)}</p> : <p className="text-slate-500">No budget configured</p>}</div></div>
    <div className="mt-4 max-h-[38rem] space-y-4 overflow-y-auto pr-1">{groups.map(group => <div key={group.key} className="rounded-xl border bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black">{group.name}</h3><span className="text-xs font-bold text-slate-500">{group.players.length}{group.min ? ` / Min ${group.min}` : ""}{group.max !== null ? ` / Max ${group.max}` : ""}</span></div><div className="mt-2 space-y-2">{group.players.map(player => <div key={player.id} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 p-2 text-sm"><button onClick={() => {}} className="min-w-0 flex-1 cursor-default text-left"><strong className="block truncate">{player.name}</strong><span className="block truncate text-xs text-slate-500">{player.role ?? "No role"} · {formatMoney(player.sold_price)}</span></button>{canUndo ? <button disabled={pending} onClick={() => onUndo(player)} aria-label={`Undo pick for ${player.name}`} className="min-h-10 rounded-lg border border-amber-300 bg-white px-2 text-xs font-bold text-amber-900">Undo Pick</button> : null}</div>)}</div></div>)}{!groups.length ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No players purchased yet.</p> : null}</div>
    <div className="mt-4 space-y-3 border-t pt-4"><h3 className="text-sm font-black">Bucket Progress</h3>{progress.map(item => { const target = item.bucket.maximum_players ?? Math.max(item.bucket.minimum_players, 1); return <div key={item.bucket.id}><div className="flex justify-between gap-2 text-xs font-bold"><span>{item.bucket.name}</span><span>{item.state === "maximum" ? "Max reached" : `${item.count}${item.bucket.minimum_players ? ` / Min ${item.bucket.minimum_players}` : ""}`}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-[var(--team-primary)]" style={{ width: `${Math.min(100, item.count / target * 100)}%` }} /></div></div>; })}</div>
  </section>;
}

function HistoryPanel({ snapshot }: { snapshot: AuctionSnapshot }) {
  return <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Auction history ({snapshot.history.length})</summary><div className="mt-3 max-h-60 space-y-2 overflow-y-auto">{snapshot.history.map(item => { const player = snapshot.players.find(entry => entry.id === item.player_id); return <div key={item.id} className="border-b pb-2 text-xs"><strong>{player?.name ?? "Player"}</strong><p>{item.action.replaceAll("_", " ")} {item.new_status === "my_team" ? `· ${formatMoney(item.new_price ?? 0)}` : ""}</p><time className="text-slate-400">{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>; })}</div></details>;
}

function PlansPanel({ snapshot, active, onPlan, onPlayer }: { snapshot: AuctionSnapshot; active: PlanLabel; onPlan: (plan: PlanLabel) => void; onPlayer: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [role, setRole] = useState("");
  const current = planAuctionProgress(snapshot, active);
  const query = search.trim().toLocaleLowerCase();
  const roles = [...new Set(current.players.map(player => player.role).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
  const players = current.players.filter(player => (!query || player.name.toLocaleLowerCase().includes(query)) && (!bucket || player.bucket_id === bucket) && (!role || player.role === role));
  return <section className="rounded-2xl border bg-white p-4 shadow-sm xl:sticky xl:top-20">
    <div><p className="team-accent-text text-xs font-bold uppercase">Pre-Auction Plans</p><h2 className="text-xl font-black">Plan {active}</h2><p className="mt-1 text-sm text-slate-500">{current.secured} Secured · {current.lost} Lost · {current.available} Available</p><p className="mt-1 text-xs font-bold text-slate-600">{current.secured} / {current.players.length} Secured</p></div>
    <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Auction plans">{(["A", "B", "C"] as const).map(label => { const item = planAuctionProgress(snapshot, label); return <button key={label} role="tab" aria-selected={active === label} onClick={() => onPlan(label)} className={`min-h-11 rounded-xl border px-2 text-sm font-bold ${active === label ? "team-soft" : "bg-white"}`}>Plan {label}<span className="block text-[10px]">{item.secured}/{item.players.length}</span></button>; })}</div>
    <label htmlFor={`plan-search-${active}`} className="mt-4 block text-xs font-bold uppercase text-slate-500">Find planned player</label><input id={`plan-search-${active}`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search planned player" className="mt-2 min-h-11 w-full rounded-xl border px-3 outline-none focus:border-[var(--team-primary)] focus:ring-2 focus:ring-[var(--team-focus)]" />
    <div className="mt-2 grid grid-cols-2 gap-2"><Filter value={bucket} onChange={setBucket} label="All buckets" options={snapshot.buckets.map(item => [item.id, item.name])} /><Filter value={role} onChange={setRole} label="All roles" options={roles.map(item => [item, item])} /></div>
    {(search || bucket || role) ? <button type="button" onClick={() => { setSearch(""); setBucket(""); setRole(""); }} className="mt-2 min-h-9 text-xs font-bold text-slate-500 underline-offset-4 hover:underline">Clear plan filters</button> : null}
    <div role="tabpanel" className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pr-1">{players.map(player => <button key={player.id} onClick={() => onPlayer(player.id)} className={`min-h-20 w-full rounded-xl border p-3 text-left ${player.auction_status === "my_team" ? "border-emerald-200 bg-emerald-50" : player.auction_status === "other_team" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-slate-400"}`}><div className="flex justify-between gap-2"><strong className="min-w-0 truncate">{player.name}</strong><Status status={player.auction_status} /></div><p className="mt-1 text-xs text-slate-500">{player.role ?? "No role"} · {player.bucketName ?? "Unassigned"}</p>{player.priority ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{PRIORITY_LABELS[player.priority]}</p> : null}</button>)}{!players.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">{query || bucket || role ? "No planned players match your filters." : `No players in Plan ${active}.`}</p> : null}</div>
  </section>;
}
