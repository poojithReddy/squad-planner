import { notFound } from "next/navigation";
import { TeamTheme } from "@/components/theme/team-theme";
import { getAuthorisedTeam } from "@/lib/teams/queries";

export default async function TeamWorkspaceLayout({children,params}:{children:React.ReactNode;params:Promise<{teamId:string}>}){
  const {teamId}=await params;
  const team=await getAuthorisedTeam(teamId);
  if(!team)notFound();
  return <><TeamTheme primaryColour={team.primary_colour}/>{children}</>;
}
