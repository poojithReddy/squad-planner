import Link from "next/link";
import { PlayerImport } from "@/components/players/player-import";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
export default async function ImportPage({params}:{params:Promise<{teamId:string}>}){const{teamId}=await params;await requireTeamAccess(teamId,true);return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8"><TeamNav teamId={teamId}/><Link href={`/teams/${teamId}/players`} className="text-sm font-bold text-slate-500">← Player pool</Link><h1 className="mt-4 text-3xl font-bold text-ink">Import players</h1><p className="mt-2 text-slate-500">Map unknown spreadsheet headers, validate every row, resolve duplicates, then confirm.</p><div className="mt-6"><PlayerImport teamId={teamId}/></div></div>}
