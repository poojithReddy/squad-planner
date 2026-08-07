import "server-only";

import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types/database";
import { PLANNING_EDIT_ROLES } from "@/types/planning";

export async function requireTeamAccess(teamId: string, edit = false) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();
  const role = data.role as TeamRole;
  if (edit && !PLANNING_EDIT_ROLES.includes(role as (typeof PLANNING_EDIT_ROLES)[number])) {
    throw new Error("You have read-only access to this team.");
  }
  return { user, role, canEdit: PLANNING_EDIT_ROLES.includes(role as (typeof PLANNING_EDIT_ROLES)[number]) };
}
