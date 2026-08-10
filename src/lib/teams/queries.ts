import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { TEAM_IMAGE_BUCKET } from "@/lib/storage/team-images";
import type { TeamCardView, Team } from "@/types/team";

async function signedUrl(path: string | null) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(TEAM_IMAGE_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function withAssetUrls(team: Team): Promise<TeamCardView> {
  const [logoSignedUrl, bannerSignedUrl] = await Promise.all([signedUrl(team.logo_url), signedUrl(team.banner_url)]);
  return { ...team, logoSignedUrl, bannerSignedUrl };
}

export async function getAuthorisedTeams() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase.from("team_members").select("team_id").eq("user_id",user.id);
  if(membershipError) throw new Error("Unable to load your team access.");
  const teamIds=(memberships??[]).map(item=>item.team_id);
  if(!teamIds.length)return{teams:[],setupRequired:false};
  const { data, error } = await supabase.from("teams").select("*").in("id",teamIds).order("created_at", { ascending: false });
  if (error) {
    const setupRequired = error.code === "42P01" || error.code === "PGRST205" || error.message.toLowerCase().includes("schema cache");
    if (setupRequired) return { teams: [], setupRequired: true };
    throw new Error("Unable to load your teams.");
  }
  return { teams: await Promise.all((data ?? []).map(withAssetUrls)), setupRequired: false };
}

export async function getAuthorisedTeam(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (error) throw new Error("Unable to load this team.");
  return data ? withAssetUrls(data) : null;
}
