import { requirePermission } from "@/lib/permissions/server";
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{teamId:string}>}){const{teamId}=await params;await requirePermission({module:"team_players",action:"view",scopeType:"team",scopeId:teamId});return children}
