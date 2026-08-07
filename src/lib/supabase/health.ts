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
type Phase3Status = { auction_buckets?: boolean; players?: boolean; probable_teams?: boolean; probable_team_players?: boolean; rls?: boolean; cross_team_constraints?: boolean };
type Phase4Status = { auction_history?: boolean; lifecycle_history?: boolean; auction_rpc?: boolean; lifecycle_rpc?: boolean; realtime_players?: boolean; realtime_history?: boolean };

export async function getSupabaseHealth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const urlConfigured = Boolean(url);
  const keyConfigured = Boolean(key);

  if (!urlConfigured || !keyConfigured) {
    return buildResult(urlConfigured, keyConfigured, false, false, false, false, false, {});
  }

  const supabase = await createClient();
  const [authResponse, profiles, teams, members, setup, phase3, phase4] = await Promise.all([
    fetch(`${url!.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key! },
      cache: "no-store",
    }).then((response) => response.ok).catch(() => false),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("teams").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("team_members").select("id", { head: true, count: "exact" }).limit(1),
    supabase.rpc("app_setup_status"),
    supabase.rpc("phase3_setup_status"),
    supabase.rpc("phase4_setup_status"),
  ]);

  const setupStatus = isSetupStatus(setup.data) ? setup.data : {};
  const result = buildResult(
    true,
    true,
    authResponse,
    !profiles.error,
    !teams.error,
    !members.error,
    !setup.error,
    setupStatus,
  );
  const phase3Status = isSetupStatus(phase3.data) ? phase3.data as Phase3Status : {};
  result.checks.push(
    { key: "players_phase3", label: "Phase 3 player pool", ok: !phase3.error && phase3Status.players === true },
    { key: "buckets_phase3", label: "Phase 3 auction buckets", ok: !phase3.error && phase3Status.auction_buckets === true },
    { key: "planning_phase3", label: "Phase 3 probable plans", ok: !phase3.error && phase3Status.probable_teams === true && phase3Status.probable_team_players === true },
    { key: "security_phase3", label: "Phase 3 RLS and team constraints", ok: !phase3.error && phase3Status.rls === true && phase3Status.cross_team_constraints === true },
  );
  const phase4Status = isSetupStatus(phase4.data) ? phase4.data as Phase4Status : {};
  result.checks.push(
    { key: "history_phase4", label: "Phase 4 auction audit history", ok: !phase4.error && phase4Status.auction_history === true && phase4Status.lifecycle_history === true },
    { key: "rpc_phase4", label: "Phase 4 atomic auction functions", ok: !phase4.error && phase4Status.auction_rpc === true && phase4Status.lifecycle_rpc === true },
    { key: "realtime_phase4", label: "Phase 4 Realtime publication", ok: !phase4.error && phase4Status.realtime_players === true && phase4Status.realtime_history === true },
  );
  return result;
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
