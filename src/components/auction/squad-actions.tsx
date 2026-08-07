"use client";

import { useEffect,useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeAuctionStatus } from "@/app/(protected)/teams/[teamId]/auction/actions";
import { createClient } from "@/lib/supabase/client";

export function SquadRealtime({teamId}:{teamId:string}){const router=useRouter();useEffect(()=>{const supabase=createClient();const channel=supabase.channel(`squad:${teamId}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"players",filter:`team_id=eq.${teamId}`},()=>router.refresh()).subscribe();return()=>{void supabase.removeChannel(channel)}},[router,teamId]);return null}

export function UndoPickButton({teamId,playerId,playerName}:{teamId:string;playerId:string;playerName:string}){
  const router=useRouter(),[message,setMessage]=useState(""),[pending,startTransition]=useTransition();
  function undo(){if(!window.confirm(`Remove ${playerName} from your squad and return this player to Available?`))return;startTransition(async()=>{const result=await changeAuctionStatus(teamId,playerId,"my_team","available",0);if(result.ok){router.refresh()}else setMessage(result.message??"Unable to undo this pick.")})}
  return <div><button disabled={pending} onClick={undo} className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900">{pending?"Undoing…":"Undo Pick"}</button>{message?<p role="alert" className="mt-1 max-w-44 text-xs text-red-700">{message}</p>:null}</div>;
}
