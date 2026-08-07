"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { PLAYER_ROLES, PRIORITY_LABELS, type AuctionBucket, type Player } from "@/types/planning";
import { initialFormState, type FormState } from "@/types/forms";

export function PlayerForm({ action, buckets, player }: { action: (state: FormState, data: FormData) => Promise<FormState>; buckets: AuctionBucket[]; player?: Player }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [availability, setAvailability] = useState(player?.availability_status ?? "unknown");
  const control = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-ink outline-none focus:border-pitch focus:ring-4 focus:ring-pitch/10";
  return <form action={formAction} className="space-y-6">
    <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
      <Field label="Player name"><input name="name" required defaultValue={player?.name} className={control} /></Field>
      <Field label="Role"><select name="role" defaultValue={player?.role ?? ""} className={control}><option value="">Not set</option>{PLAYER_ROLES.map(role => <option key={role}>{role}</option>)}</select></Field>
      <Field label="Bucket"><select name="bucketId" defaultValue={player?.bucket_id ?? ""} className={control}><option value="">Unassigned</option>{buckets.map(bucket => <option key={bucket.id} value={bucket.id}>{bucket.name}</option>)}</select></Field>
      <Field label="Priority"><select name="priority" defaultValue={player?.priority ?? ""} className={control}><option value="">Not ranked</option>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Expected price"><input name="expectedPrice" type="number" min="0" step="0.01" defaultValue={player?.expected_price ?? 0} className={control} /></Field>
      <Field label="Availability"><select name="availability" value={availability} onChange={event => setAvailability(event.target.value as typeof availability)} className={control}><option value="full">Full League</option><option value="partial">Partial</option><option value="unknown">Unknown</option></select></Field>
      {availability === "partial" ? <Field label="Available matches"><input name="availableMatches" type="number" min="0" step="1" defaultValue={player?.available_matches ?? ""} className={control} /></Field> : null}
      <Field label="Availability notes" wide><textarea name="availabilityNotes" rows={3} defaultValue={player?.availability_notes ?? ""} className={control} /></Field>
      <Field label="Planning notes" wide><textarea name="notes" rows={4} defaultValue={player?.notes ?? ""} className={control} /></Field>
    </div>
    <FormMessage state={state} />
    <div className="ml-auto max-w-xs"><SubmitButton pendingLabel="Saving…">Save player</SubmitButton></div>
  </form>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`block text-sm font-semibold text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>; }
