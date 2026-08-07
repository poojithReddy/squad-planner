"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [{href:"/",label:"Home"},{href:"/features",label:"Features"},{href:"/#how-it-works",label:"How It Works"},{href:"/about",label:"About"}];
export function PublicMobileMenu() {
  const [open,setOpen]=useState(false);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  return <div className="lg:hidden">
    <button type="button" onClick={()=>setOpen(value=>!value)} aria-label={open?"Close navigation menu":"Open navigation menu"} aria-expanded={open} aria-controls="public-mobile-menu" className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-ink">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open?"M6 6l12 12M18 6 6 18":"M4 7h16M4 12h16M4 17h16"}/></svg>
    </button>
    {open ? <div className="fixed inset-0 top-16 z-50 bg-ink/30" onClick={()=>setOpen(false)}><nav id="public-mobile-menu" aria-label="Mobile public navigation" className="ml-auto flex h-full w-[min(22rem,90vw)] flex-col overflow-y-auto bg-white p-5 shadow-2xl" onClick={event=>event.stopPropagation()}>
      {links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-bold text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
      <div className="mt-4 grid gap-2 border-t pt-5"><Link href="/login" onClick={()=>setOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl border font-bold">Login</Link><Link href="/signup" onClick={()=>setOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl bg-pitch font-bold text-white">Create Account</Link></div>
    </nav></div> : null}
  </div>;
}
