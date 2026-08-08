"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({children,pendingLabel="Please wait…",teamAccent=false}:{children:React.ReactNode;pendingLabel?:string;teamAccent?:boolean}){
  const{pending}=useFormStatus();
  return <button type="submit" disabled={pending} className={`flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none ${teamAccent?"team-primary":"bg-pitch text-white shadow-[0_12px_28px_-12px_rgba(22,115,75,.7)] hover:bg-pitch-dark"}`}>{pending?pendingLabel:children}</button>;
}
