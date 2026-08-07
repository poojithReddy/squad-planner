"use server";

import { revalidatePath } from "next/cache";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/forms";

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const minimum = Number(formData.get("minimumPlayers") ?? 0);
  const maxText = String(formData.get("maximumPlayers") ?? "").trim();
  const maximum = maxText ? Number(maxText) : null;
  const budget = Number(formData.get("plannedBudget") ?? 0);
  if (!name) return { error: "Bucket name is required." };
  if (!Number.isInteger(minimum) || minimum < 0) return { error: "Minimum players must be a whole number of 0 or greater." };
  if (maximum !== null && (!Number.isInteger(maximum) || maximum < minimum)) return { error: "Maximum players must be at least the minimum." };
  if (!Number.isFinite(budget) || budget < 0) return { error: "Planned budget must be 0 or greater." };
  return { data: { name, description, minimum_players: minimum, maximum_players: maximum, planned_budget: budget } };
}

export async function createBucket(teamId: string, _state: FormState, formData: FormData): Promise<FormState> { await requireTeamAccess(teamId, true); const parsed = parse(formData); if (!parsed.data) return { status: "error", message: parsed.error ?? "Invalid bucket." }; const supabase = await createClient(); const { data: last } = await supabase.from("auction_buckets").select("display_order").eq("team_id", teamId).order("display_order", { ascending: false }).limit(1).maybeSingle(); const { error } = await supabase.from("auction_buckets").insert({ team_id: teamId, display_order: (last?.display_order ?? -1) + 1, ...parsed.data }); if (error) return { status: "error", message: error.message }; revalidatePath(`/teams/${teamId}/buckets`); return { status: "success", message: "Bucket created." }; }
export async function updateBucket(teamId: string, bucketId: string, _state: FormState, formData: FormData): Promise<FormState> { await requireTeamAccess(teamId, true); const parsed = parse(formData); if (!parsed.data) return { status: "error", message: parsed.error ?? "Invalid bucket." }; const supabase = await createClient(); const { error } = await supabase.from("auction_buckets").update(parsed.data).eq("team_id", teamId).eq("id", bucketId); if (error) return { status: "error", message: error.message }; revalidatePath(`/teams/${teamId}/buckets`); return { status: "success", message: "Bucket updated." }; }
export async function deleteBucket(teamId: string, bucketId: string) { await requireTeamAccess(teamId, true); const supabase = await createClient(); const { error } = await supabase.from("auction_buckets").delete().eq("team_id", teamId).eq("id", bucketId); if (error) throw new Error("Unable to delete this bucket."); revalidatePath(`/teams/${teamId}/buckets`); revalidatePath(`/teams/${teamId}/players`); }
export async function moveBucket(teamId: string, bucketId: string, direction: "up" | "down") { await requireTeamAccess(teamId, true); const supabase = await createClient(); const { data } = await supabase.from("auction_buckets").select("id,display_order").eq("team_id", teamId).order("display_order").order("name"); if (!data) return; const index = data.findIndex(row => row.id === bucketId); const swapIndex = direction === "up" ? index - 1 : index + 1; if (index < 0 || swapIndex < 0 || swapIndex >= data.length) return; await Promise.all([supabase.from("auction_buckets").update({ display_order: data[swapIndex].display_order }).eq("id", data[index].id), supabase.from("auction_buckets").update({ display_order: data[index].display_order }).eq("id", data[swapIndex].id)]); revalidatePath(`/teams/${teamId}/buckets`); }
