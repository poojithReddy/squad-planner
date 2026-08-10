"use client";

import { useActionState } from "react";
import { createManagedTeam,inviteOrAssignUser } from "@/app/(protected)/tournaments/[tournamentId]/admin/actions";

const initial:{message:string;ok?:boolean}={message:""};
export function CreateManagedTeamForm({tournamentId}:{tournamentId:string}){
  const[state,action,pending]=useActionState(createManagedTeam.bind(null,tournamentId),initial);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Team Name"><input name="name" required/></Field><Field label="Primary Colour"><input name="primaryColour" type="color" defaultValue="#15803d"/></Field><Field label="Secondary Colour"><input name="secondaryColour" type="color" defaultValue="#ffffff"/></Field><Field label="Squad Size"><input name="squadSize" type="number" min="1" step="1" defaultValue="18" required/></Field><Field label="Auction Budget"><input name="budget" type="number" min="0" step="0.01" defaultValue="0" required/></Field><Field label="Manager (optional)"><input name="managerName"/></Field><div className="sm:col-span-2"><button disabled={pending} className="team-primary min-h-11 rounded-xl px-5 font-bold">{pending?"Creating…":"Create Team"}</button>{state.message?<p role="status" className={`mt-2 text-sm ${state.ok?"text-emerald-700":"text-red-700"}`}>{state.message}</p>:null}</div></form>
}

export function InviteUserForm({tournamentId,teams}:{tournamentId:string;teams:{id:string;name:string}[]}){
  const[state,action,pending]=useActionState(inviteOrAssignUser.bind(null,tournamentId),initial);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Full Name"><input name="fullName"/></Field><Field label="Email"><input name="email" type="email" required/></Field><Field label="Team"><select name="teamId" required><option value="">Select team</option>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></Field><Field label="Team Role"><select name="role" required><option value="captain">Captain</option><option value="vice_captain">Vice Captain</option><option value="manager">Manager</option><option value="member">Member</option><option value="viewer">Viewer</option></select></Field><label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="replace" type="checkbox" className="size-5"/> Replace the existing Captain/Vice Captain when applicable</label><div className="sm:col-span-2"><button disabled={pending} className="team-primary min-h-11 rounded-xl px-5 font-bold">{pending?"Saving…":"Invite or Assign User"}</button>{state.message?<p role="status" className={`mt-2 text-sm ${state.ok?"text-emerald-700":"text-red-700"}`}>{state.message}</p>:null}</div></form>
}

function Field({label,children}:{label:string;children:React.ReactElement<{className?:string}>}){return <label className="text-sm font-semibold text-slate-700">{label}{<children.type {...children.props} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3"/>}</label>}
