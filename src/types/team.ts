import type { TeamRow } from "@/types/database";

export type Team = TeamRow;

export interface TeamCardView extends TeamRow {
  logoSignedUrl: string | null;
  bannerSignedUrl: string | null;
}
