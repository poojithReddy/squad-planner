"use client";

import { useActionState } from "react";
import { createTournament,inviteTournamentUser,updateTournament } from "@/app/(protected)/admin/actions";
import type { TournamentLifecycle } from "@/types/database";

const initial:{message:string;ok?:boolean}={message:""};
const statuses=["draft","setup","active","completed","archived"] as const;
function Field({label,children}:{label:string;children:React.ReactElement<{className?:string}>}){return <label className="text-sm font-semibold text-slate-700">{label}{<children.type {...children.props} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3"/>}</label>}

export function TournamentForm({tournament}:{tournament?:{id:string;name:string;start_date:string;end_date:string|null;location:string|null;notes:string|null;status?:TournamentLifecycle}}){
  const actionFn=tournament?updateTournament.bind(null,tournament.id):createTournament;
  const[state,action,pending]=useActionState(actionFn,initial);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Tournament Name"><input name="name" required defaultValue={tournament?.name}/></Field><Field label="Status"><select name="status" defaultValue={tournament?.status??"draft"}>{statuses.map(status=><option key={status} value={status}>{status[0].toUpperCase()+status.slice(1)}</option>)}</select></Field><Field label="Start Date"><input name="startDate" type="date" required defaultValue={tournament?.start_date}/></Field><Field label="End Date"><input name="endDate" type="date" defaultValue={tournament?.end_date??""}/></Field><Field label="Location"><input name="location" defaultValue={tournament?.location??""}/></Field><Field label="Description"><input name="notes" defaultValue={tournament?.notes??""}/></Field><div className="sm:col-span-2"><button disabled={pending} className="min-h-11 rounded-xl bg-pitch px-5 font-bold text-white disabled:opacity-60">{pending?"Saving…":tournament?"Save Changes":"Create Tournament"}</button>{state.message?<p role="status" className={`mt-2 text-sm ${state.ok?"text-emerald-700":"text-red-700"}`}>{state.message}</p>:null}</div></form>
}

export function TournamentAccessForm({tournamentId}:{tournamentId:string}){
  const[state,action,pending]=useActionState(inviteTournamentUser.bind(null,tournamentId),initial);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Full Name"><input name="fullName"/></Field><Field label="Email"><input name="email" type="email" required/></Field><Field label="Tournament Role"><select name="role"><option value="tournament_admin">Tournament Admin</option><option value="tournament_viewer">Tournament Viewer</option></select></Field><div className="self-end"><button disabled={pending} className="min-h-11 rounded-xl bg-pitch px-5 font-bold text-white disabled:opacity-60">{pending?"Assigning…":"Invite or Assign"}</button></div>{state.message?<p role="status" className={`sm:col-span-2 text-sm ${state.ok?"text-emerald-700":"text-red-700"}`}>{state.message}</p>:null}</form>
}
