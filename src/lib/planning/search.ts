import type { PlayerWithBucket } from "@/lib/planning/queries";

export type PlanningSearchFilters={query:string;bucketId:string;role:string;priority:string;availability:string};

export function filterPlanningPlayers(players:PlayerWithBucket[],filters:PlanningSearchFilters){
  const query=filters.query.trim().toLocaleLowerCase();
  return players.filter(player=>(!query||player.name.toLocaleLowerCase().includes(query))&&(!filters.bucketId||player.bucket_id===filters.bucketId)&&(!filters.role||player.role===filters.role)&&(!filters.priority||player.priority===Number(filters.priority))&&(!filters.availability||player.availability_status===filters.availability));
}
