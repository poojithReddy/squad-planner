import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface SupabaseHealthCheck {
  key: string;
  label: string;
  ok: boolean;
}

type SetupStatus = {
  profiles_rls?: boolean;
  teams_rls?: boolean;
  team_members_rls?: boolean;
  foreign_keys?: boolean;
  unique_membership?: boolean;
  check_constraints?: boolean;
  create_team_function?: boolean;
  team_assets_bucket?: boolean;
};

export async function getSupabaseHealth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const urlConfigured = Boolean(url);
  const keyConfigured = Boolean(key);

  if (!urlConfigured || !keyConfigured) {
    return buildResult(urlConfigured, keyConfigured, false, false, false, false, false, {});
  }

  const supabase = await createClient();
  const [authResponse, profiles, teams, members, setup] = await Promise.all([
    fetch(`${url!.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key! },
      cache: "no-store",
    }).then((response) => response.ok).catch(() => false),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("teams").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("team_members").select("id", { head: true, count: "exact" }).limit(1),
    supabase.rpc("app_setup_status"),
  ]);

  const setupStatus = isSetupStatus(setup.data) ? setup.data : {};
  return buildResult(
    true,
    true,
    authResponse,
    !profiles.error,
    !teams.error,
    !members.error,
    !setup.error,
    setupStatus,
  );
}

function isSetupStatus(value: unknown): value is SetupStatus {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildResult(
  urlConfigured: boolean,
  keyConfigured: boolean,
  authentication: boolean,
  profiles: boolean,
  teams: boolean,
  teamMembers: boolean,
  metadataAvailable: boolean,
  setup: SetupStatus,
) {
  const checks: SupabaseHealthCheck[] = [
    { key: "url", label: "Supabase URL configured", ok: urlConfigured },
    { key: "publishable_key", label: "Supabase publishable key configured", ok: keyConfigured },
    { key: "client", label: "Supabase client", ok: authentication || profiles || teams || teamMembers },
    { key: "profiles", label: "Profiles table", ok: profiles },
    { key: "teams", label: "Teams table", ok: teams },
    { key: "team_members", label: "Team Members table", ok: teamMembers },
    { key: "authentication", label: "Authentication", ok: authentication },
    { key: "storage", label: "Private team-assets Storage", ok: metadataAvailable && setup.team_assets_bucket === true },
    { key: "rls", label: "Row Level Security", ok: metadataAvailable && setup.profiles_rls === true && setup.teams_rls === true && setup.team_members_rls === true },
    { key: "constraints", label: "Foreign keys and constraints", ok: metadataAvailable && setup.foreign_keys === true && setup.unique_membership === true && setup.check_constraints === true },
    { key: "create_team", label: "Atomic create_team function", ok: metadataAvailable && setup.create_team_function === true },
  ];

  return {
    connected: checks.find((check) => check.key === "client")?.ok === true,
    databaseReachable: profiles || teams || teamMembers,
    checks,
  };
}
