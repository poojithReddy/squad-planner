"use server";

import { revalidatePath } from "next/cache";

import { normalizeAvailability, normalizeImportedRole, normalizeStatistic, type BucketImportDecision, type BucketImportRow, type ValidatedBucketImportRow } from "@/lib/import/bucket-player";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import { normalisePlayerName } from "@/types/planning";

async function requireBucket(teamId: string, bucketId: string) {
  const access = await requireTeamAccess(teamId, true);
  const supabase = await createClient();
  const { data } = await supabase.from("auction_buckets").select("id,name").eq("id", bucketId).eq("team_id", teamId).maybeSingle();
  if (!data) throw new Error("The selected bucket is unavailable.");
  return { ...access, supabase, bucket: data };
}

export async function validateBucketImport(teamId: string, bucketId: string, rows: BucketImportRow[]) {
  const { supabase } = await requireBucket(teamId, bucketId);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 2000) return { rows: [], error: "Import must contain between 1 and 2,000 rows." };
  const { data: existing } = await supabase.from("players").select("id,name").eq("team_id", teamId);
  const existingMap = new Map((existing ?? []).map(player => [normalisePlayerName(player.name), player.id]));
  const counts = new Map<string, number>();
  rows.forEach(row => { const key = normalisePlayerName(row.name); if (key) counts.set(key, (counts.get(key) ?? 0) + 1); });
  const validated: ValidatedBucketImportRow[] = rows.map(row => {
    const errors: string[] = [];
    const name = row.name.trim().replace(/\s+/g, " ");
    const role = normalizeImportedRole(row.role);
    if (!name) errors.push("Name is required.");
    if (!role) errors.push("Player Role is required.");
    const normalized = {
      availability: normalizeAvailability(row.availability), matches: normalizeStatistic(row.matches),
      battingScore: normalizeStatistic(row.battingScore), bowlingWickets: normalizeStatistic(row.bowlingWickets), catches: normalizeStatistic(row.catches),
    };
    const numericFields = [["Matches", row.matches, normalized.matches], ["Batting Score", row.battingScore, normalized.battingScore], ["Bowling Wickets", row.bowlingWickets, normalized.bowlingWickets], ["Catches", row.catches, normalized.catches]] as const;
    const normalizedFields = numericFields.filter(([, original, value]) => String(original).trim() !== String(value)).map(([label, original]) => `${label}: “${original || "blank"}” was normalised to 0 or truncated.`);
    const key = normalisePlayerName(name);
    return { ...row, name, role, errors, normalized, normalizedFields, existingPlayerId: existingMap.get(key) ?? null, duplicateInFile: (counts.get(key) ?? 0) > 1 };
  });
  return { rows: validated };
}

export async function confirmBucketImport(teamId: string, bucketId: string, filename: string, rows: BucketImportRow[], decisions: Record<number, BucketImportDecision>) {
  const { supabase, user, bucket } = await requireBucket(teamId, bucketId);
  const validation = await validateBucketImport(teamId, bucketId, rows);
  if (validation.error || !validation.rows.length) return { ok: false, message: validation.error ?? "No valid rows were found." };
  let imported = 0, updated = 0, skipped = 0, failed = validation.rows.filter(row => row.errors.length).length;
  for (const row of validation.rows) {
    if (row.errors.length) continue;
    const duplicate = Boolean(row.existingPlayerId || row.duplicateInFile);
    const decision = duplicate ? decisions[row.rowNumber] ?? "skip" : "import";
    if (decision === "skip") { skipped++; continue; }
    const record = { name: row.name, role: row.role, availability_status: row.normalized.availability, matches: row.normalized.matches, batting_score: row.normalized.battingScore, bowling_wickets: row.normalized.bowlingWickets, catches: row.normalized.catches, bucket_id: bucketId };
    if (decision === "update" && row.existingPlayerId) {
      const { error } = await supabase.from("players").update(record).eq("team_id", teamId).eq("id", row.existingPlayerId);
      if (error) failed++; else updated++;
      continue;
    }
    if (decision === "update") { skipped++; continue; }
    const { error } = await supabase.from("players").insert({ team_id: teamId, ...record });
    if (error) failed++; else imported++;
  }
  await supabase.from("player_import_history").insert({ team_id: teamId, bucket_id: bucketId, imported_by: user.id, filename: filename.slice(0, 255) || "player-import", total_rows: rows.length, imported_rows: imported, updated_rows: updated, skipped_rows: skipped, failed_rows: failed });
  revalidatePath(`/teams/${teamId}/buckets`);
  revalidatePath(`/teams/${teamId}/players`);
  return { ok: true, message: "Import complete", bucketName: bucket.name, imported, updated, skipped, failed };
}
