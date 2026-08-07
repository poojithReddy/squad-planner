import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuctionBucket, Player } from "@/types/planning";

export type PlayerWithBucket = Player & { auction_buckets: { name: string } | null };

export async function getBuckets(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("auction_buckets").select("*").eq("team_id", teamId).order("display_order").order("name");
  if (error) throw new Error("Migration 002 is required before buckets can be loaded.");
  return (data ?? []) as AuctionBucket[];
}

export async function getPlayers(teamId: string) {
  const supabase = await createClient();
  const [{ data, error }, { data: buckets }] = await Promise.all([
    supabase.from("players").select("*").eq("team_id", teamId).order("priority", { nullsFirst: false }).order("name"),
    supabase.from("auction_buckets").select("id,name").eq("team_id", teamId),
  ]);
  if (error) throw new Error("Migration 002 is required before players can be loaded.");
  const names = new Map((buckets ?? []).map(bucket => [bucket.id, bucket.name]));
  return (data ?? []).map(player => ({ ...player, auction_buckets: player.bucket_id ? { name: names.get(player.bucket_id) ?? "Unknown bucket" } : null })) as PlayerWithBucket[];
}

export async function getPlayer(teamId: string, playerId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("players").select("*").eq("team_id", teamId).eq("id", playerId).maybeSingle();
  return data as Player | null;
}

export async function getPlanningData(teamId: string) {
  const supabase = await createClient();
  const [{ data: plans, error: planError }, { data: selections, error: selectionError }] = await Promise.all([
    supabase.from("probable_teams").select("*").eq("team_id", teamId).order("plan_label"),
    supabase.from("probable_team_players").select("*").eq("team_id", teamId).order("display_order"),
  ]);
  if (planError || selectionError) throw new Error("Migration 002 is required before planning can be loaded.");
  return { plans: plans ?? [], selections: selections ?? [] };
}
