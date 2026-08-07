import type { Database, AuctionLifecycle } from "@/types/database";

type Team=Database["public"]["Tables"]["teams"]["Row"];
type Player=Database["public"]["Tables"]["players"]["Row"];
type Match=Database["public"]["Tables"]["matches"]["Row"];
type MatchPlayer=Database["public"]["Tables"]["match_players"]["Row"];
type Duty=Database["public"]["Tables"]["volunteer_duties"]["Row"];
type Assignment=Database["public"]["Tables"]["volunteer_duty_assignments"]["Row"];

export interface TeamDashboardMetrics {
  lifecycle: AuctionLifecycle;
  squadCount: number;
  squadTarget: number;
  slotsRemaining: number;
  squadComplete: boolean;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  noResults: number;
  playersUsed: number;
  playersYetToPlay: number;
  playersYetToPlayNames: string[];
  nextFixture: Match | null;
  upcomingDuties: number;
  openDutyPositions: number;
}

export function calculateTeamDashboard(team:Team,players:Player[],matches:Match[],matchPlayers:MatchPlayer[],duties:Duty[],assignments:Assignment[],today:string):TeamDashboardMetrics {
  const squad=players.filter(player=>player.auction_status==="my_team");
  const squadIds=new Set(squad.map(player=>player.id));
  const usedIds=new Set(matchPlayers.filter(row=>row.playing_status==="playing"&&squadIds.has(row.player_id)).map(row=>row.player_id));
  const played=matches.filter(match=>["won","lost","draw","no_result"].includes(match.result));
  const nextFixture=matches.filter(match=>match.result==="scheduled"&&match.match_date>=today).sort((a,b)=>`${a.match_date}T${a.match_time??"23:59"}`.localeCompare(`${b.match_date}T${b.match_time??"23:59"}`))[0]??null;
  const upcoming=duties.filter(duty=>duty.duty_date>=today&&duty.status!=="cancelled"&&duty.status!=="completed");
  const assignedByDuty=new Map<string,number>();
  for(const assignment of assignments)assignedByDuty.set(assignment.duty_id,(assignedByDuty.get(assignment.duty_id)??0)+1);
  const totalBudget=Number(team.total_auction_budget)||0;
  const totalSpent=squad.reduce((sum,player)=>sum+(Number(player.sold_price)||0),0);
  const playersYetToPlay=squad.filter(player=>!usedIds.has(player.id));
  return {
    lifecycle:team.auction_status,
    squadCount:squad.length,
    squadTarget:team.squad_size,
    slotsRemaining:Math.max(0,team.squad_size-squad.length),
    squadComplete:squad.length>=team.squad_size,
    totalBudget,totalSpent,remainingBudget:totalBudget>0?totalBudget-totalSpent:null,
    matchesPlayed:played.length,
    wins:played.filter(match=>match.result==="won").length,
    losses:played.filter(match=>match.result==="lost").length,
    draws:played.filter(match=>match.result==="draw").length,
    noResults:played.filter(match=>match.result==="no_result").length,
    playersUsed:usedIds.size,
    playersYetToPlay:playersYetToPlay.length,
    playersYetToPlayNames:playersYetToPlay.slice(0,3).map(player=>player.name),
    nextFixture,
    upcomingDuties:upcoming.length,
    openDutyPositions:upcoming.reduce((sum,duty)=>sum+Math.max(0,duty.required_people-(assignedByDuty.get(duty.id)??0)),0),
  };
}
