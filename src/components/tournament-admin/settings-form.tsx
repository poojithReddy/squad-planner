"use client";
import { useActionState } from "react";
import { updateTournamentSettings } from "@/app/(protected)/tournaments/[tournamentId]/admin/actions";
import type { Database } from "@/types/database";

export function TournamentSettingsForm({tournamentId,tournament}:{tournamentId:string;tournament:Database["public"]["Tables"]["tournaments"]["Row"]}){
  const[state,action,pending]=useActionState(updateTournamentSettings.bind(null,tournamentId),{message:"",ok:undefined as boolean|undefined});
  const input="mt-1 min-h-11 w-full rounded-xl border px-3";
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Tournament Name<input name="name" required defaultValue={tournament.name} className={input}/></label><label className="text-sm font-bold">Location<input name="location" defaultValue={tournament.location??""} className={input}/></label><label className="text-sm font-bold">Start Date<input name="startDate" type="date" required defaultValue={tournament.start_date} className={input}/></label><label className="text-sm font-bold">End Date<input name="endDate" type="date" defaultValue={tournament.end_date??""} className={input}/></label><label className="text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={5} defaultValue={tournament.notes??""} className={input}/></label><div className="sm:col-span-2"><button disabled={pending} className="team-primary min-h-11 rounded-xl px-5 font-bold">{pending?"Saving…":"Save Tournament"}</button>{state.message?<p role="status" className={`mt-2 text-sm ${state.ok?"text-emerald-700":"text-red-700"}`}>{state.message}</p>:null}</div></form>;
}
