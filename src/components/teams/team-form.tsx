"use client";

import { useActionState } from "react";

import { createTeam } from "@/app/(protected)/teams/new/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/types/forms";

export function TeamForm() {
  const [state, formAction] = useActionState(createTeam, initialFormState);
  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-bold text-ink">Temporary team creation test</h2><p className="mt-1 text-sm text-slate-500">Uses the atomic `create_team` database function. Image uploads are intentionally excluded.</p></div>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Development foundation</span>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Input label="Team name" name="name" defaultValue={state.fields?.name} required />
          <Input label="Primary colour" name="primaryColour" placeholder="Blue or #0000FF" defaultValue={state.fields?.primaryColour} required />
          <Input label="Captain name" name="captainName" defaultValue={state.fields?.captainName} required />
          <Input label="Vice captain name" name="viceCaptainName" defaultValue={state.fields?.viceCaptainName} />
          <Input label="Manager name (optional)" name="managerName" defaultValue={state.fields?.managerName} />
          <Input label="Squad size" name="squadSize" type="number" min="1" step="1" defaultValue={state.fields?.squadSize ?? "18"} required />
          <Input label="Total auction budget" name="totalAuctionBudget" type="number" min="0" step="0.01" defaultValue={state.fields?.totalAuctionBudget ?? "0"} required />
        </div>
      </section>

      <FormMessage state={state} />
      <div className="ml-auto max-w-xs"><SubmitButton pendingLabel="Creating team…">Create test team</SubmitButton></div>
    </form>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...props} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3.5 text-base text-ink outline-none focus:border-pitch focus:ring-4 focus:ring-pitch/10" /></label>;
}
