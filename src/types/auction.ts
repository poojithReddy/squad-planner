import type { AuctionLifecycle, AuctionStatus, Database } from "@/types/database";
import type { AuctionBucket, Player, ProbableSelection, ProbableTeam } from "@/types/planning";

export type AuctionHistory = Database["public"]["Tables"]["auction_history"]["Row"];
export type AuctionPlayer = Player & { bucketName: string | null };
export type AuctionTeam = { id: string; name: string; squad_size: number; total_auction_budget: number; primary_colour: string | null; logoSignedUrl: string | null; auction_status: AuctionLifecycle };
export type AuctionSnapshot = { team: AuctionTeam; players: AuctionPlayer[]; buckets: AuctionBucket[]; plans: ProbableTeam[]; selections: ProbableSelection[]; history: AuctionHistory[]; canEdit: boolean; canControlLifecycle: boolean };
export type AuctionMutationResult = { ok: boolean; player?: Player; message?: string; code?: "conflict" | "squad_limit" | "bucket_max" | "forbidden" | "error" };
export type Recommendation = { player: AuctionPlayer; score: number; reasons: string[]; budgetRisk: boolean };
export type AuctionFilterStatus = AuctionStatus | "all";
