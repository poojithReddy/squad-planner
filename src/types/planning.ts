import type { AuctionStatus, AvailabilityStatus, Database } from "@/types/database";

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type AuctionBucket = Database["public"]["Tables"]["auction_buckets"]["Row"];
export type ProbableTeam = Database["public"]["Tables"]["probable_teams"]["Row"];
export type ProbableSelection = Database["public"]["Tables"]["probable_team_players"]["Row"];

export const PLAYER_ROLES = ["Batter", "Wicketkeeper Batter", "All-rounder", "Bowling All-rounder", "Spin All-rounder", "Fast Bowler", "Medium/Fast Bowler", "Spinner", "Wicketkeeper", "Other"] as const;
export const PRIORITY_LABELS: Record<number, string> = { 1: "Highest Priority", 2: "High", 3: "Medium", 4: "Low", 5: "Backup" };
export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = { full: "Full League", partial: "Partial", unknown: "Unknown" };
export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = { available: "Available", my_team: "My Team", other_team: "Other Team" };
export const PLANNING_EDIT_ROLES = ["owner", "captain", "vice_captain", "manager"] as const;

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

export function normalisePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
