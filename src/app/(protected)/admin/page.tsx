import Link from "next/link";
import { requireSuperAdmin } from "@/lib/platform/admin-access";
import { requirePermission } from "@/lib/permissions/server";

export default async function SuperAdminPage(){
  await requirePermission({module:"admin_dashboard",action:"view",scopeType:"platform",scopeId:null});
  const{supabase}=await requireSuperAdmin();
  const[{data:tournaments},{count:teams},{count:admins}]=await Promise.all([
    supabase.from("tournaments").select("id,name,start_date,end_date,status").order("created_at",{ascending:false}),
    supabase.from("teams").select("id",{count:"exact",head:true}),
    supabase.from("tournament_members").select("id",{count:"exact",head:true}).eq("role","tournament_admin")
  ]);
  const rows=tournaments??[],active=rows.filter(item=>item.status==="active").length,archived=rows.filter(item=>item.status==="archived"||item.status==="completed").length;
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase text-pitch">Platform administration</p><h1 className="mt-1 text-3xl font-black">Super Admin</h1><p className="mt-2 text-slate-500">Manage tournament structure and access without opening private team strategy.</p></div><Link href="/admin/tournaments#new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pitch px-5 font-bold text-white">Create Tournament</Link></div><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Tournaments",rows.length],["Active",active],["Completed / Archived",archived],["Teams",teams??0],["Tournament Admins",admins??0]].map(([label,value])=><article key={String(label)} className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>)}</section><section className="mt-8"><h2 className="text-xl font-black">Recent tournaments</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{rows.slice(0,6).map(item=><article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.start_date} — {item.end_date??"Open end"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{item.status??"setup"}</span></div><div className="mt-5 flex flex-wrap gap-2"><Link href={`/admin/tournaments/${item.id}`} className="rounded-xl border px-4 py-2 text-sm font-bold">Manage</Link><Link href={`/tournaments/${item.id}/admin`} className="rounded-xl bg-pitch px-4 py-2 text-sm font-bold text-white">Open Admin</Link></div></article>)}{!rows.length?<p className="rounded-2xl border border-dashed bg-white p-8 text-slate-500">No tournaments yet. Create the first tournament to begin.</p>:null}</div></section></main>;
}
