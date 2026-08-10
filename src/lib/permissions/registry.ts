export const permissionActions = [
  "view", "create", "edit", "delete", "manage", "export", "import", "bid", "manage_members",
] as const;

export type PermissionAction = (typeof permissionActions)[number];
export type PermissionScope = "platform" | "tournament" | "team";

export const teamModuleRegistry = [
  { key: "team_dashboard", suffix: "", label: "Dashboard", icon: "dashboard" },
  { key: "team_players", suffix: "players", label: "Players", icon: "players" },
  { key: "team_buckets", suffix: "buckets", label: "Buckets", icon: "buckets" },
  { key: "team_planning", suffix: "planning", label: "Planning", icon: "planning" },
  { key: "team_auction", suffix: "auction", label: "Auction", icon: "auction" },
  { key: "team_squad", suffix: "squad", label: "Squad", icon: "squad" },
  { key: "team_matches", suffix: "tournament", label: "Tournament", icon: "tournament" },
  { key: "team_opportunities", suffix: "opportunities", label: "Opportunities", icon: "opportunities" },
  { key: "team_duties", suffix: "duties", label: "Volunteer Duties", icon: "duties" },
  { key: "team_reports", suffix: "reports", label: "Reports", icon: "reports" },
] as const;

export type TeamModuleKey = (typeof teamModuleRegistry)[number]["key"];
export type PermissionMap = Record<string, Partial<Record<PermissionAction, boolean>>>;

export function permissionGranted(map: PermissionMap | undefined, module: string, action: PermissionAction) {
  return map?.[module]?.[action] === true;
}
