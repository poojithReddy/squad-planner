import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { PermissionAction, PermissionMap, PermissionScope } from "@/lib/permissions/registry";

export async function getPermissionMap(scopeType: PermissionScope, scopeId: string | null): Promise<PermissionMap> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_effective_permissions", { p_scope_type: scopeType, p_scope_id: scopeId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return {};
  return data as PermissionMap;
}

export async function hasPermission(input: { module: string; action: PermissionAction; scopeType: PermissionScope; scopeId: string | null }) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_has_permission", {
    p_module_key: input.module, p_action_key: input.action, p_scope_type: input.scopeType, p_scope_id: input.scopeId,
  });
  return !error && data === true;
}

export async function requirePermission(input: { module: string; action: PermissionAction; scopeType: PermissionScope; scopeId: string | null; mode?: "route" | "mutation" }) {
  const allowed = await hasPermission(input);
  if (!allowed) {
    if (input.mode === "mutation") throw new Error("You do not have permission to perform this action.");
    notFound();
  }
}
