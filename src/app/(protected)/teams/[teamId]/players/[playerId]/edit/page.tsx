import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerForm } from "@/components/players/player-form";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getBuckets, getPlayer } from "@/lib/planning/queries";
import { deletePlayer, updatePlayer } from "../../actions";

export default async function EditPlayerPage({ params }: { params: Promise<{ teamId: string; playerId: string }> }) { const { teamId, playerId } = await params; await requireTeamAccess(teamId, true); const [buckets, player] = await Promise.all([getBuckets(teamId), getPlayer(teamId, playerId)]); if (!player) notFound(); return <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8"><TeamNav teamId={teamId}/><Link href={`/teams/${teamId}/players`} className="text-sm font-bold text-slate-500">← Player pool</Link><div className="mt-4 flex items-center justify-between"><h1 className="text-3xl font-bold text-ink">Edit {player.name}</h1><form action={deletePlayer.bind(null, teamId, playerId)}><button className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700">Delete</button></form></div><div className="mt-6"><PlayerForm buckets={buckets} player={player} action={updatePlayer.bind(null, teamId, playerId)}/></div></div>; }
