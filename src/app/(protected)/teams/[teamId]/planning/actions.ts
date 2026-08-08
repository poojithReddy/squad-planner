"use server";

import { revalidatePath } from "next/cache";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import type { ProbableSelection } from "@/types/planning";

export type PlanningMutationResult = { ok: true; selection?: ProbableSelection } | { ok: false; message: string };

function refreshPlanning(teamId: string) {
  revalidatePath(`/teams/${teamId}/planning`);
  revalidatePath(`/teams/${teamId}/auction`);
}

export async function addToPlan(teamId: string, planId: string, playerId: string): Promise<PlanningMutationResult> {
  await requireTeamAccess(teamId, true);
  if (!playerId || !planId) return { ok: false, message: "Select a player before adding to the plan." };
  const supabase = await createClient();
  const { data: plan } = await supabase.from("probable_teams").select("id").eq("id", planId).eq("team_id", teamId).maybeSingle();
  const { data: player } = await supabase.from("players").select("id").eq("id", playerId).eq("team_id", teamId).maybeSingle();
  if (!plan || !player) return { ok: false, message: "This player or plan is no longer available." };

  const { data: existing } = await supabase.from("probable_team_players").select("*").eq("team_id", teamId).eq("probable_team_id", planId).eq("player_id", playerId).maybeSingle();
  if (existing) return { ok: true, selection: existing as ProbableSelection };

  const { data: last } = await supabase.from("probable_team_players").select("display_order").eq("team_id", teamId).eq("probable_team_id", planId).order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from("probable_team_players").insert({ team_id: teamId, probable_team_id: planId, player_id: playerId, display_order: (last?.display_order ?? -1) + 1 }).select("*").single();
  if (error || !data) return { ok: false, message: "We couldn't add this player. Please try again." };
  refreshPlanning(teamId);
  return { ok: true, selection: data as ProbableSelection };
}

export async function removeFromPlan(teamId: string, selectionId: string): Promise<PlanningMutationResult> {
  await requireTeamAccess(teamId, true);
  const supabase = await createClient();
  const { error } = await supabase.from("probable_team_players").delete().eq("team_id", teamId).eq("id", selectionId);
  if (error) return { ok: false, message: "We couldn't remove this player. Please try again." };
  refreshPlanning(teamId);
  return { ok: true };
}

export async function movePlanPlayer(teamId: string, selectionId: string, direction: "up" | "down", targetSelectionId?: string): Promise<PlanningMutationResult> {
  await requireTeamAccess(teamId, true);
  const supabase = await createClient();
  const { data: current } = await supabase.from("probable_team_players").select("probable_team_id").eq("team_id", teamId).eq("id", selectionId).maybeSingle();
  if (!current) return { ok: false, message: "This plan selection no longer exists." };
  const { data } = await supabase.from("probable_team_players").select("id,display_order").eq("team_id", teamId).eq("probable_team_id", current.probable_team_id).order("display_order");
  if (!data) return { ok: false, message: "We couldn't load the current plan order." };
  const index = data.findIndex(row => row.id === selectionId);
  const requestedIndex = targetSelectionId ? data.findIndex(row => row.id === targetSelectionId) : -1;
  const swapIndex = requestedIndex >= 0 ? requestedIndex : direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= data.length) return { ok: true };
  const [first, second] = await Promise.all([
    supabase.from("probable_team_players").update({ display_order: data[swapIndex].display_order }).eq("team_id", teamId).eq("id", data[index].id),
    supabase.from("probable_team_players").update({ display_order: data[index].display_order }).eq("team_id", teamId).eq("id", data[swapIndex].id),
  ]);
  if (first.error || second.error) return { ok: false, message: "We couldn't reorder this plan. Please try again." };
  refreshPlanning(teamId);
  return { ok: true };
}
