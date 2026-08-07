import type { Database } from "@/types/database";
export type Tournament=Database["public"]["Tables"]["tournaments"]["Row"];
export type Match=Database["public"]["Tables"]["matches"]["Row"];
export type MatchPlayer=Database["public"]["Tables"]["match_players"]["Row"];
export type Participation={playerId:string;selected:number;playing:number;substitute:number;notSelected:number;tournamentMatches:number};
