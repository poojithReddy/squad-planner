"use client";

import { useEffect, useRef, useState } from "react";
import { updateTeamBudget } from "@/app/(protected)/teams/[teamId]/buckets/actions";
import { calculateBudgetPosition, normalizeTeamBudget } from "@/lib/planning/budget";
import { formatMoney } from "@/types/planning";

export function BucketBudgetSummary({ teamId, initialBudget, allocation, canEdit }: { teamId: string; initialBudget: number; allocation: number; canEdit: boolean }) {
  const [budget, setBudget] = useState(initialBudget);
  const [input, setInput] = useState(String(initialBudget));
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const { difference, overPlanned } = calculateBudgetPosition(budget, allocation);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, pending]);

  async function save() {
    if (pending) return;
    const value = normalizeTeamBudget(input);
    if (value === null) { setMessage("Team budget must be a number of 0 or greater."); return; }
    setPending(true); setMessage("");
    try {
      const result = await updateTeamBudget(teamId, value);
      if (!result.ok || result.budget === undefined) setMessage(result.message ?? "We couldn't update the team budget.");
      else { setBudget(result.budget); setInput(String(result.budget)); setOpen(false); }
    } catch { setMessage("We couldn't update the team budget. Please try again."); }
    finally { setPending(false); }
  }

  return <>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Summary label="Team budget" value={budget > 0 ? formatMoney(budget) : "No team auction budget configured"} action={canEdit ? <button onClick={() => { setInput(String(budget)); setMessage(""); setOpen(true); }} className="team-accent-text min-h-10 rounded-lg px-2 text-sm font-bold underline-offset-4 hover:underline">Edit Budget</button> : null} />
      <Summary label="Bucket allocation" value={formatMoney(allocation)} />
      <Summary label={difference >= 0 ? "Unallocated" : "Over-planned"} value={formatMoney(difference >= 0 ? difference : overPlanned)} warning={difference < 0} />
    </section>
    {difference < 0 ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Over-planned by {formatMoney(overPlanned)}. Saving remains allowed because bucket budgets are planning guidance.</p> : null}
    {open ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title" onMouseDown={event => { if (event.target === event.currentTarget && !pending) setOpen(false); }}><div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><h2 id="budget-dialog-title" className="text-xl font-bold">Team Auction Budget</h2><p className="mt-1 text-sm text-slate-500">Bucket planned budgets will not be changed.</p><label className="mt-5 block text-sm font-bold">Total budget<input autoFocus value={input} onChange={event => setInput(event.target.value)} type="number" min="0" step="0.01" inputMode="decimal" className="mt-2 min-h-12 w-full rounded-xl border px-3 outline-none focus:border-[var(--team-primary)] focus:ring-2 focus:ring-[var(--team-focus)]" /></label>{message ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{message}</p> : null}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button disabled={pending} onClick={() => setOpen(false)} className="min-h-12 rounded-xl border px-5 font-bold disabled:opacity-50">Cancel</button><button disabled={pending} onClick={save} className="team-primary min-h-12 rounded-xl px-5 font-bold disabled:cursor-wait disabled:opacity-60">{pending ? "Saving..." : "Save Budget"}</button></div></div></div> : null}
  </>;
}

function Summary({ label, value, warning = false, action }: { label: string; value: string; warning?: boolean; action?: React.ReactNode }) { return <div className={`rounded-2xl border p-5 ${warning ? "border-amber-300 bg-amber-50" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className={`mt-2 font-bold ${value.length > 18 ? "text-base" : "text-2xl"}`}>{value}</p></div>{action}</div></div>; }
