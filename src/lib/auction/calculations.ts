import type { AuctionPlayer, AuctionSnapshot, Recommendation } from "@/types/auction";

export type PlanFilter="all"|"A"|"B"|"C"|"none";

export function planLabelsForPlayer(snapshot:AuctionSnapshot,playerId:string){
  const planIds=new Set(snapshot.selections.filter(selection=>selection.player_id===playerId).map(selection=>selection.probable_team_id));
  return snapshot.plans.filter(plan=>planIds.has(plan.id)).map(plan=>plan.plan_label).sort();
}

export function filterPlayersByPlan(snapshot:AuctionSnapshot,players:AuctionPlayer[],plan:PlanFilter){
  if(plan==="all")return players;
  return players.filter(player=>{const labels=planLabelsForPlayer(snapshot,player.id);return plan==="none"?!labels.length:labels.includes(plan)});
}

export function planAuctionProgress(snapshot:AuctionSnapshot,label:"A"|"B"|"C"){
  const plan=snapshot.plans.find(item=>item.plan_label===label);
  const players=plan?snapshot.selections.filter(selection=>selection.probable_team_id===plan.id).map(selection=>snapshot.players.find(player=>player.id===selection.player_id)).filter((player):player is AuctionPlayer=>Boolean(player)):[];
  return {players,secured:players.filter(player=>player.auction_status==="my_team").length,lost:players.filter(player=>player.auction_status==="other_team").length,available:players.filter(player=>player.auction_status==="available").length};
}

export function auctionTotals(snapshot: AuctionSnapshot) {
  const squad = snapshot.players.filter(player => player.auction_status === "my_team");
  const spent = squad.reduce((sum, player) => sum + player.sold_price, 0);
  return { squad, spent, remaining: snapshot.team.total_auction_budget - spent, slotsLeft: Math.max(0, snapshot.team.squad_size - squad.length) };
}

export function bucketProgress(snapshot: AuctionSnapshot) {
  return snapshot.buckets.map(bucket => {
    const won = snapshot.players.filter(player => player.bucket_id === bucket.id && player.auction_status === "my_team");
    const spent = won.reduce((sum, player) => sum + player.sold_price, 0);
    const count = won.length;
    const state = count < bucket.minimum_players ? "below" : bucket.maximum_players !== null && count > bucket.maximum_players ? "above" : bucket.maximum_players !== null && count === bucket.maximum_players ? "maximum" : "target";
    return { bucket, won, count, spent, remaining: bucket.planned_budget - spent, state };
  });
}

export function rankRecommendations(snapshot: AuctionSnapshot): Recommendation[] {
  const totals = auctionTotals(snapshot);
  const progress = new Map(bucketProgress(snapshot).map(item => [item.bucket.id, item]));
  const planRanks = new Map<string, number>();
  for (const plan of snapshot.plans) {
    const rank = plan.plan_label === "A" ? 3 : plan.plan_label === "B" ? 2 : 1;
    for (const selection of snapshot.selections.filter(item => item.probable_team_id === plan.id)) {
      planRanks.set(selection.player_id, Math.max(planRanks.get(selection.player_id) ?? 0, rank));
    }
  }
  return snapshot.players.filter(player => player.auction_status === "available").map(player => {
    let score = 0; const reasons: string[] = [];
    const bucket = player.bucket_id ? progress.get(player.bucket_id) : undefined;
    if (bucket?.state === "below") { score += 100; reasons.push(`${bucket.bucket.name} is below its minimum target`); }
    if (bucket?.state === "maximum" || bucket?.state === "above") score -= 80;
    const planRank = planRanks.get(player.id) ?? 0;
    if (planRank) { score += planRank * 25; reasons.push(`Plan ${planRank === 3 ? "A" : planRank === 2 ? "B" : "C"} target`); }
    if (player.priority) { score += (6 - player.priority) * 10; if (player.priority <= 2) reasons.push(player.priority === 1 ? "Highest priority" : "High priority"); }
    const availabilityScore = player.availability_status === "full" ? 15 : player.availability_status === "partial" ? 7 : 0;
    score += availabilityScore; if (player.availability_status === "full") reasons.push("Full league availability");
    const budgetRisk = snapshot.team.total_auction_budget > 0 && player.expected_price > totals.remaining;
    if (budgetRisk) score -= 50; else if (snapshot.team.total_auction_budget > 0) { score += 8; reasons.push("Expected price fits remaining team budget"); }
    if (!reasons.length) reasons.push("Available player in the auction pool");
    return { player, score, reasons, budgetRisk };
  }).sort((a, b) => b.score - a.score || (a.player.priority ?? 99) - (b.player.priority ?? 99) || a.player.name.localeCompare(b.player.name));
}
