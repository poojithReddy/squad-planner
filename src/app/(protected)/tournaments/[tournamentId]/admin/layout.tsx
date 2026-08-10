import Link from "next/link";
import { requireTournamentAdmin } from "@/lib/tournament/admin-access";
import { getPermissionMap } from "@/lib/permissions/server";
import { permissionGranted } from "@/lib/permissions/registry";

export default async function TournamentAdminLayout({children,params}:{children:React.ReactNode;params:Promise<{tournamentId:string}>}){
  const{tournamentId}=await params;await requireTournamentAdmin(tournamentId);const permissions=await getPermissionMap("tournament",tournamentId);
  const links=[['Overview','',"tournament_overview"],['Registration','registration',"registration"],['Player Pool','players',"player_pool"],['Teams','teams',"teams"],['Live Auction','auction',"auction_control"],['Users & Access','users',"tournament_users"],['Roles & Permissions','roles',"tournament_users"],['Tournament Settings','settings',"tournament_overview"]].filter(([, ,module])=>permissionGranted(permissions,module,"view"));
  return <div><div className="border-b bg-white"><nav aria-label="Tournament Admin" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">{links.map(([label,path])=><Link key={label} href={`/tournaments/${tournamentId}/admin${path?`/${path}`:""}`} className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">{label}</Link>)}</nav></div>{children}</div>
}
