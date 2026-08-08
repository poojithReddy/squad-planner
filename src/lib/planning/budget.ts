export function normalizeTeamBudget(value: unknown) {
  if (typeof value === "string" && !value.trim()) return null;
  const budget = typeof value === "number" ? value : Number(value);
  return Number.isFinite(budget) && budget >= 0 ? Math.round(budget * 100) / 100 : null;
}

export function calculateBudgetPosition(teamBudget: number, bucketAllocation: number) {
  const difference = teamBudget - bucketAllocation;
  return { difference, unallocated: Math.max(0, difference), overPlanned: Math.max(0, -difference) };
}
