import Link from "next/link";
import { requireTournamentAdmin } from "@/lib/tournament/admin-access";

export default async function TournamentAdminLayout({children,params}:{children:React.ReactNode;params:Promise<{tournamentId:string}>}){
  const{tournamentId}=await params;await requireTournamentAdmin(tournamentId);
  const links=[['Overview',''],['Registration','registration'],['Player Pool','players'],['Teams','teams'],['Live Auction','auction'],['Users & Access','users'],['Tournament Settings','settings']];
  return <div><div className="border-b bg-white"><nav aria-label="Tournament Admin" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">{links.map(([label,path])=><Link key={label} href={`/tournaments/${tournamentId}/admin${path?`/${path}`:""}`} className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">{label}</Link>)}</nav></div>{children}</div>
}
