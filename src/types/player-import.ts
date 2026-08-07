export const IMPORT_FIELDS = ["name","role","priority","expectedPrice","availability","availableMatches","availabilityNotes","notes","bucket"] as const;
export type ImportField = typeof IMPORT_FIELDS[number];
export type ImportRow = Record<ImportField, string> & { rowNumber: number };
export type ValidatedImportRow = ImportRow & { existingPlayerId: string | null; errors: string[] };
export type DuplicateDecision = "skip" | "replace" | "import";
export const IMPORT_LABELS: Record<ImportField,string> = {name:"Player Name",role:"Role",priority:"Priority",expectedPrice:"Expected Price",availability:"Availability",availableMatches:"Available Matches",availabilityNotes:"Availability Notes",notes:"Notes",bucket:"Bucket"};
