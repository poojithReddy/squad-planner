export type FixtureImportRow = {
  rowNumber: number; matchNumber: number | null; date: string; time: string | null; opponent: string;
  venue: string | null; round: string | null; notes: string | null; errors: string[];
};

const aliases = {
  matchNumber: ["match number", "match no", "match"], date: ["date", "match date"], time: ["time", "match time"],
  opponent: ["opponent", "opposition", "team"], venue: ["venue", "ground", "location"], round: ["round", "stage"], notes: ["notes", "comment"],
} as const;

function header(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " "); }
function text(value: unknown) { const result = String(value ?? "").trim(); return result || null; }
function pad(value: number) { return String(value).padStart(2, "0"); }

export function normalizeFixtureDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const excelEpoch = Date.UTC(1899, 11, 30); const date = new Date(excelEpoch + Math.trunc(value) * 86400000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  const raw = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const dayFirst = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(raw);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : dayFirst ? [Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1])] : null;
  if (!parts) return null;
  const [year, month, day] = parts; const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? `${year}-${pad(month)}-${pad(day)}` : null;
}

export function normalizeFixtureTime(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  if (typeof value === "number" && value >= 0 && value < 1) { const minutes = Math.round(value * 1440) % 1440; return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`; }
  const raw = String(value).trim().toUpperCase(); const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/.exec(raw);
  if (!match) return "invalid";
  let hour = Number(match[1]); const minute = Number(match[2]); const meridiem = match[3];
  if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return "invalid";
  if (meridiem === "AM" && hour === 12) hour = 0; if (meridiem === "PM" && hour !== 12) hour += 12;
  return `${pad(hour)}:${pad(minute)}`;
}

export function parseFixtureRows(rows: unknown[][]) {
  if (!rows.length) return { rows: [] as FixtureImportRow[], missing: ["Date", "Opponent"] };
  const headings = rows[0].map(header); const index = (field: keyof typeof aliases) => headings.findIndex(item => aliases[field].includes(item as never));
  const indexes = { matchNumber: index("matchNumber"), date: index("date"), time: index("time"), opponent: index("opponent"), venue: index("venue"), round: index("round"), notes: index("notes") };
  const missing = [...(indexes.date < 0 ? ["Date"] : []), ...(indexes.opponent < 0 ? ["Opponent"] : [])];
  if (missing.length) return { rows: [] as FixtureImportRow[], missing };
  const parsed = rows.slice(1).filter(row => row.some(value => text(value))).map((row, offset) => {
    const date = normalizeFixtureDate(row[indexes.date]); const opponent = text(row[indexes.opponent]) ?? ""; const normalizedTime = indexes.time >= 0 ? normalizeFixtureTime(row[indexes.time]) : null;
    const rawNumber = indexes.matchNumber >= 0 ? Number(row[indexes.matchNumber]) : NaN; const matchNumber = Number.isInteger(rawNumber) && rawNumber > 0 ? rawNumber : null;
    const errors = [...(!date ? ["Valid match date is required"] : []), ...(!opponent ? ["Opponent is required"] : []), ...(normalizedTime === "invalid" ? ["Time is invalid"] : [])];
    return { rowNumber: offset + 2, matchNumber, date: date ?? "", time: normalizedTime === "invalid" ? null : normalizedTime, opponent, venue: indexes.venue >= 0 ? text(row[indexes.venue]) : null, round: indexes.round >= 0 ? text(row[indexes.round]) : null, notes: indexes.notes >= 0 ? text(row[indexes.notes]) : null, errors };
  });
  return { rows: parsed, missing };
}

export function fixtureDuplicateKey(row: Pick<FixtureImportRow,"date"|"time"|"opponent">) { return `${row.date}|${row.time ?? ""}|${row.opponent.trim().toLowerCase().replace(/\s+/g," ")}`; }
