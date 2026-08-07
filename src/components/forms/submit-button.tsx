"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({children,pendingLabel="Please wait…"}:{children:React.ReactNode;pendingLabel?:string}){
  const{pending}=useFormStatus();
  return <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(22,115,75,.7)] transition hover:bg-pitch-dark disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">{pending?pendingLabel:children}</button>;
}
