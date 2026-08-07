"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityStatus } from "@/types/database";
import type { FormState } from "@/types/forms";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function nullable(formData: FormData, key: string) { return text(formData, key) || null; }

function parsePlayer(formData: FormData) {
  const name = text(formData, "name");
  const expectedPrice = Number(text(formData, "expectedPrice") || 0);
  const priorityText = text(formData, "priority");
  const priority = priorityText ? Number(priorityText) : null;
  const availability = text(formData, "availability") as AvailabilityStatus;
  const matchesText = text(formData, "availableMatches");
  const availableMatches = availability === "partial" && matchesText ? Number(matchesText) : null;
  if (!name) return { error: "Player name is required." };
  if (priority !== null && (!Number.isInteger(priority) || priority < 1 || priority > 5)) return { error: "Choose a valid priority." };
  if (!Number.isFinite(expectedPrice) || expectedPrice < 0) return { error: "Expected price must be 0 or greater." };
  if (!["full", "partial", "unknown"].includes(availability)) return { error: "Choose a valid availability." };
  if (availableMatches !== null && (!Number.isInteger(availableMatches) || availableMatches < 0)) return { error: "Available matches must be a whole number of 0 or greater." };
  return { data: { name, role: nullable(formData, "role"), bucket_id: nullable(formData, "bucketId"), priority, expected_price: expectedPrice, availability_status: availability, available_matches: availableMatches, availability_notes: nullable(formData, "availabilityNotes"), notes: nullable(formData, "notes") } };
}

export async function createPlayer(teamId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireTeamAccess(teamId, true);
  const parsed = parsePlayer(formData);
  if (!parsed.data) return { status: "error", message: parsed.error ?? "Invalid player." };
  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({ team_id: teamId, ...parsed.data });
  if (error) return { status: "error", message: error.message.includes("players_bucket_same_team") ? "That bucket belongs to another team." : "We couldn't create this player. Please try again." };
  revalidatePath(`/teams/${teamId}/players`);
  redirect(`/teams/${teamId}/players`);
}

export async function updatePlayer(teamId: string, playerId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireTeamAccess(teamId, true);
  const parsed = parsePlayer(formData);
  if (!parsed.data) return { status: "error", message: parsed.error ?? "Invalid player." };
  const supabase = await createClient();
  const { error } = await supabase.from("players").update(parsed.data).eq("team_id", teamId).eq("id", playerId);
  if (error) return { status: "error", message: "We couldn't update this player. Please try again." };
  revalidatePath(`/teams/${teamId}/players`);
  redirect(`/teams/${teamId}/players`);
}

export async function deletePlayer(teamId: string, playerId: string) {
  await requireTeamAccess(teamId, true);
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("team_id", teamId).eq("id", playerId);
  if (error) throw new Error("Unable to delete this player.");
  revalidatePath(`/teams/${teamId}/players`);
}
