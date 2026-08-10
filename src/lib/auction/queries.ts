import "server-only";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import { getAuthorisedTeam } from "@/lib/teams/queries";
import {getPermissionMap}from"@/lib/permissions/server";import{permissionGranted}from"@/lib/permissions/registry";
import type { AuctionSnapshot } from "@/types/auction";

export async function getAuctionSnapshot(teamId: string): Promise<AuctionSnapshot | null> {
  const [, team,permissions] = await Promise.all([requireTeamAccess(teamId), getAuthorisedTeam(teamId),getPermissionMap("team",teamId)]);
  if (!team) return null;
  const supabase = await createClient();
  const [players, buckets, plans, selections, history] = await Promise.all([
    supabase.from("players").select("*").eq("team_id", teamId).order("name"),
    supabase.from("auction_buckets").select("*").eq("team_id", teamId).order("display_order"),
    supabase.from("probable_teams").select("*").eq("team_id", teamId).order("plan_label"),
    supabase.from("probable_team_players").select("*").eq("team_id", teamId).order("display_order"),
    supabase.from("auction_history").select("*").eq("team_id", teamId).order("created_at", { ascending: false }).limit(40),
  ]);
  const error = players.error ?? buckets.error ?? plans.error ?? selections.error ?? history.error;
  if (error) throw new Error("Migration 003 must be applied before the live auction can be opened.");
  const bucketNames = new Map((buckets.data ?? []).map(bucket => [bucket.id, bucket.name]));
  return {
    team: { id: team.id, name: team.name, squad_size: team.squad_size, total_auction_budget: team.total_auction_budget, primary_colour: team.primary_colour, logoSignedUrl: team.logoSignedUrl, auction_status: team.auction_status },
    players: (players.data ?? []).map(player => ({ ...player, bucketName: player.bucket_id ? bucketNames.get(player.bucket_id) ?? null : null })),
    buckets: buckets.data ?? [], plans: plans.data ?? [], selections: selections.data ?? [], history: history.data ?? [],
    canEdit: permissionGranted(permissions,"team_auction","manage"),
    canControlLifecycle: permissionGranted(permissions,"team_auction","manage"),
  };
}
