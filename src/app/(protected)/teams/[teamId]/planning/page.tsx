import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { getBuckets, getPlanningData, getPlayers } from "@/lib/planning/queries";
import { getAuthorisedTeam } from "@/lib/teams/queries";
import {getPermissionMap}from"@/lib/permissions/server";import{permissionGranted}from"@/lib/permissions/registry";

export default async function PlanningPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { teamId } = await params;
  const requested = (await searchParams).plan;
  const initialPlan = requested === "B" || requested === "C" ? requested : "A";
  const [, team, players, buckets, { plans, selections },permissions] = await Promise.all([
    requireTeamAccess(teamId),
    getAuthorisedTeam(teamId),
    getPlayers(teamId),
    getBuckets(teamId),
    getPlanningData(teamId),
    getPermissionMap("team",teamId),
  ]);
  const canEdit=permissionGranted(permissions,"team_planning","manage");
  if (!team) return null;
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <TeamNav teamId={teamId} />
    <h1 className="text-3xl font-bold text-ink">Pre-auction planning</h1>
    <p className="mt-2 text-slate-500">Build and compare responsive shortlists before auction day.</p>
    <PlanningWorkspace teamId={teamId} teamBudget={team.total_auction_budget} players={players} buckets={buckets} plans={plans} initialSelections={selections} initialPlan={initialPlan} canEdit={canEdit} />
  </div>;
}
