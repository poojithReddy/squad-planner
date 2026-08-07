import Link from "next/link";
import { PlayerForm } from "@/components/players/player-form";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getBuckets } from "@/lib/planning/queries";
import { createPlayer } from "../actions";

export default async function NewPlayerPage({ params }: { params: Promise<{ teamId: string }> }) { const { teamId } = await params; await requireTeamAccess(teamId, true); const buckets = await getBuckets(teamId); return <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8"><TeamNav teamId={teamId}/><Link href={`/teams/${teamId}/players`} className="text-sm font-bold text-slate-500">← Player pool</Link><h1 className="mt-4 text-3xl font-bold text-ink">Add player</h1><div className="mt-6"><PlayerForm buckets={buckets} action={createPlayer.bind(null, teamId)}/></div></div>; }
