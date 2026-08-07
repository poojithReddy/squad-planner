"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/forms";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalValue(formData: FormData, key: string) {
  return value(formData, key) || null;
}

export async function createTeam(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const fields = {
    name: value(formData, "name"),
    primaryColour: value(formData, "primaryColour"),
    captainName: value(formData, "captainName"),
    viceCaptainName: value(formData, "viceCaptainName"),
    managerName: value(formData, "managerName"),
    squadSize: value(formData, "squadSize"),
    totalAuctionBudget: value(formData, "totalAuctionBudget"),
  };
  const squadSize = Number(fields.squadSize);
  const budget = Number(fields.totalAuctionBudget);

  if (!fields.name) return { status: "error", message: "Team name is required.", fields };
  if (!fields.primaryColour) return { status: "error", message: "Primary colour is required.", fields };
  if (!fields.captainName) return { status: "error", message: "Captain is required.", fields };
  if (!Number.isInteger(squadSize) || squadSize <= 0) return { status: "error", message: "Squad size must be a whole number greater than 0.", fields };
  if (!Number.isFinite(budget) || budget < 0) return { status: "error", message: "Auction budget must be 0 or greater.", fields };

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("create_team", {
    p_name: fields.name,
    p_primary_colour: fields.primaryColour,
    p_captain_name: fields.captainName,
    p_vice_captain_name: optionalValue(formData, "viceCaptainName"),
    p_manager_name: optionalValue(formData, "managerName"),
    p_squad_size: squadSize,
    p_total_auction_budget: budget,
    p_secondary_colour: null,
  });

  if (error || !teamId) {
    const migrationMissing = error?.message.toLowerCase().includes("create_team");
    return {
      status: "error",
      message: migrationMissing
        ? "The database migration has not been applied yet. Run 001_initial_schema.sql in Supabase SQL Editor."
        : error?.message ?? "Unable to create the team.",
      fields,
    };
  }

  redirect(`/teams/${teamId}`);
}
