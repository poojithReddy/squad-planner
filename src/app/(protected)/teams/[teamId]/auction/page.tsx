import { notFound } from "next/navigation";
import { LiveAuction } from "@/components/auction/live-auction";
import { getAuctionSnapshot } from "@/lib/auction/queries";
export default async function AuctionPage({params}:{params:Promise<{teamId:string}>}){const{teamId}=await params;const snapshot=await getAuctionSnapshot(teamId);if(!snapshot)notFound();return <LiveAuction initial={snapshot}/>}
