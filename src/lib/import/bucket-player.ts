export const BUCKET_IMPORT_FIELDS = ["name", "availability", "role", "matches", "battingScore", "bowlingWickets", "catches"] as const;
export type BucketImportField = (typeof BUCKET_IMPORT_FIELDS)[number];
export type BucketImportRow = Record<BucketImportField, string> & { rowNumber: number };
export type BucketImportDecision = "skip" | "update" | "import";
export type ValidatedBucketImportRow = BucketImportRow & {
  existingPlayerId: string | null;
  duplicateInFile: boolean;
  errors: string[];
  normalized: { availability: "full" | "partial" | "unknown"; matches: number; battingScore: number; bowlingWickets: number; catches: number };
  normalizedFields: string[];
};

export const BUCKET_IMPORT_LABELS: Record<BucketImportField, string> = {
  name: "Name", availability: "Availability", role: "Player Role", matches: "Matches",
  battingScore: "Batting Score", bowlingWickets: "Bowling Wickets", catches: "Catches",
};

const aliases: Record<BucketImportField, string[]> = {
  name: ["name", "player name", "player"], role: ["player role", "role"], availability: ["availability", "available"],
  matches: ["matches", "matches played"], battingScore: ["batting score", "batting runs", "runs"],
  bowlingWickets: ["bowling wickets", "wickets"], catches: ["catches", "catch"],
};

const headerKey = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function detectBucketImportColumns(headers: unknown[]) {
  const normalized = headers.map(headerKey);
  const mapping: Partial<Record<BucketImportField, number>> = {};
  for (const field of BUCKET_IMPORT_FIELDS) {
    const index = normalized.findIndex(header => aliases[field].includes(header));
    if (index >= 0) mapping[field] = index;
  }
  const missing = (["name", "role"] as const).filter(field => mapping[field] === undefined).map(field => BUCKET_IMPORT_LABELS[field]);
  return { mapping, missing };
}

export function normalizeStatistic(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  const number = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

export function normalizeAvailability(value: unknown): "full" | "partial" | "unknown" {
  const normalized = headerKey(value);
  if (["full", "full league", "fully available"].includes(normalized)) return "full";
  if (["partial", "part", "partially available"].includes(normalized)) return "partial";
  return "unknown";
}

export function normalizeImportedRole(value: unknown) {
  const role = String(value ?? "").trim().replace(/\s+/g, " ");
  const suggested = ["Batter", "Wicketkeeper Batter", "All-rounder", "Bowling All-rounder", "Spin All-rounder", "Fast Bowler", "Medium/Fast Bowler", "Spinner", "Wicketkeeper", "Other"];
  return suggested.find(item => item.toLowerCase() === role.toLowerCase()) ?? role;
}

export function matrixToBucketRows(matrix: unknown[][], mapping: Partial<Record<BucketImportField, number>>): BucketImportRow[] {
  return matrix.map((row, index) => Object.fromEntries([
    ...BUCKET_IMPORT_FIELDS.map(field => [field, String(row[mapping[field] ?? -1] ?? "").trim()]),
    ["rowNumber", index + 2],
  ]) as BucketImportRow);
}
