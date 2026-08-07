"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useState, useTransition } from "react";
import { readSheet } from "read-excel-file/browser";

import { confirmBucketImport, validateBucketImport } from "@/app/(protected)/teams/[teamId]/buckets/[bucketId]/import/actions";
import { detectBucketImportColumns, matrixToBucketRows, type BucketImportDecision, type BucketImportRow, type ValidatedBucketImportRow } from "@/lib/import/bucket-player";

type Cell = string | number | boolean | Date | null;
type Result = { bucketName: string; imported: number; updated: number; skipped: number; failed: number };

export function BucketPlayerImport({ teamId, bucket }: { teamId: string; bucket: { id: string; name: string } }) {
  const [rows, setRows] = useState<BucketImportRow[]>([]);
  const [preview, setPreview] = useState<ValidatedBucketImportRow[]>([]);
  const [decisions, setDecisions] = useState<Record<number, BucketImportDecision>>({});
  const [filename, setFilename] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  async function chooseFile(file: File) {
    setMessage(""); setPreview([]); setRows([]); setResult(null);
    if (file.size > 5 * 1024 * 1024) { setMessage("The player file must be 5 MB or smaller."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "xls") { setMessage("Please convert this file to .xlsx or .csv before uploading."); return; }
    if (!extension || !["xlsx", "csv"].includes(extension)) { setMessage("Choose an .xlsx or .csv file."); return; }
    try {
      let matrix: Cell[][];
      if (extension === "xlsx") matrix = await readSheet(file) as Cell[][];
      else matrix = await new Promise((resolve, reject) => Papa.parse<Cell[]>(file, { skipEmptyLines: true, complete: parsed => parsed.errors.length ? reject(new Error("Invalid CSV")) : resolve(parsed.data), error: reject }));
      if (matrix.length < 2) throw new Error("The spreadsheet is empty or has no player rows.");
      const { mapping, missing } = detectBucketImportColumns(matrix[0]);
      if (missing.length) throw new Error(`Required column missing: ${missing.join(", ")}`);
      const dataRows = matrix.slice(1).filter(row => row.some(value => String(value ?? "").trim()));
      if (!dataRows.length) throw new Error("The spreadsheet has no player rows.");
      const mapped = matrixToBucketRows(dataRows, mapping);
      setFilename(file.name); setRows(mapped);
      startTransition(async () => {
        const checked = await validateBucketImport(teamId, bucket.id, mapped);
        setPreview(checked.rows); setMessage(checked.error ?? "");
        setDecisions(Object.fromEntries(checked.rows.filter(row => row.existingPlayerId || row.duplicateInFile).map(row => [row.rowNumber, "skip"])));
      });
    } catch { setMessage("We couldn't read that file. Check that it is a valid .xlsx or .csv file."); }
  }

  function confirm() {
    const importsDuplicate = preview.some(row => (row.existingPlayerId || row.duplicateInFile) && decisions[row.rowNumber] === "import");
    if (importsDuplicate && !window.confirm("Import duplicate player records anyway?")) return;
    startTransition(async () => {
      const response = await confirmBucketImport(teamId, bucket.id, filename, rows, decisions);
      setMessage(response.message);
      if (response.ok && response.bucketName) setResult(response as Result & { ok: true; message: string });
    });
  }

  const valid = preview.filter(row => !row.errors.length).length;
  const invalid = preview.length - valid;
  const duplicates = preview.filter(row => row.existingPlayerId || row.duplicateInFile).length;
  if (result) return <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-pitch">Import Complete</p><h2 className="mt-1 text-2xl font-bold">{result.bucketName}</h2><dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="Imported" value={result.imported} /><Stat label="Updated" value={result.updated} /><Stat label="Skipped" value={result.skipped} /><Stat label="Failed" value={result.failed} /></dl><div className="mt-6 flex flex-wrap gap-3"><Link href={`/teams/${teamId}/players?bucket=${bucket.id}&status=`} className="rounded-xl bg-pitch px-5 py-3 font-bold text-white">View Bucket</Link><button onClick={() => { setResult(null); setPreview([]); setRows([]); setMessage(""); }} className="rounded-xl border px-5 py-3 font-bold">Upload Another File</button></div></section>;

  return <div className="space-y-6">
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">1. Choose file</h2><p className="mt-2 text-sm text-slate-500">Accepted: .xlsx or .csv, maximum 5 MB. Files are processed and discarded, not stored.</p><label className="mt-5 block font-semibold">Player file<input aria-describedby="bucket-import-message" type="file" accept=".xlsx,.csv" onChange={event => event.target.files?.[0] && chooseFile(event.target.files[0])} className="mt-2 block w-full rounded-xl border p-3" /></label></section>
    {preview.length ? <><section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">2. Preview</h2><p className="mt-1 text-sm">Target bucket: <strong>{bucket.name}</strong></p><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Rows Found" value={preview.length} /><Stat label="Valid" value={valid} /><Stat label="Invalid" value={invalid} /><Stat label="Duplicates" value={duplicates} /></dl></section><Preview rows={preview} decisions={decisions} setDecisions={setDecisions} /><button onClick={confirm} disabled={pending || valid === 0} className="min-h-12 rounded-xl bg-pitch px-6 font-bold text-white disabled:opacity-50">{pending ? "Importing..." : "Confirm Import"}</button></> : null}
    <p id="bucket-import-message" role="status" aria-live="polite" className={message ? "rounded-xl border bg-white p-4 font-semibold" : "sr-only"}>{message || "Ready for a player file."}</p>
  </div>;
}

function Preview({ rows, decisions, setDecisions }: { rows: ValidatedBucketImportRow[]; decisions: Record<number, BucketImportDecision>; setDecisions: (value: Record<number, BucketImportDecision>) => void }) {
  return <section className="rounded-2xl border bg-white p-4 shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr>{["Name", "Availability", "Role", "Matches", "Batting", "Wickets", "Catches", "Status"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.rowNumber} className="border-t align-top"><td className="p-3 font-bold">{row.name || `Row ${row.rowNumber}`}</td><td className="p-3 capitalize">{row.normalized.availability}</td><td className="p-3">{row.role || "Missing"}</td><td className="p-3">{row.normalized.matches}</td><td className="p-3">{row.normalized.battingScore}</td><td className="p-3">{row.normalized.bowlingWickets}</td><td className="p-3">{row.normalized.catches}</td><td className="p-3"><RowStatus row={row} decisions={decisions} setDecisions={setDecisions} /></td></tr>)}</tbody></table></div><div className="grid gap-3 md:hidden">{rows.map(row => <article key={row.rowNumber} className="rounded-xl border p-4"><h3 className="font-bold">{row.name || `Row ${row.rowNumber}`}</h3><p className="text-sm text-slate-500">{row.role || "Player Role missing"} · {row.normalized.availability}</p><dl className="mt-3 grid grid-cols-2 gap-2"><Stat label="Matches" value={row.normalized.matches} /><Stat label="Batting" value={row.normalized.battingScore} /><Stat label="Wickets" value={row.normalized.bowlingWickets} /><Stat label="Catches" value={row.normalized.catches} /></dl><div className="mt-3"><RowStatus row={row} decisions={decisions} setDecisions={setDecisions} /></div></article>)}</div></section>;
}

function RowStatus({ row, decisions, setDecisions }: { row: ValidatedBucketImportRow; decisions: Record<number, BucketImportDecision>; setDecisions: (value: Record<number, BucketImportDecision>) => void }) {
  if (row.errors.length) return <div>{row.errors.map(error => <p key={error} className="text-red-700">Invalid — {error}</p>)}</div>;
  const duplicate = row.existingPlayerId || row.duplicateInFile;
  return <div>{row.normalizedFields.map(note => <p key={note} className="text-xs text-amber-700">{note}</p>)}{duplicate ? <label className="mt-2 block text-xs font-bold">Duplicate action<select value={decisions[row.rowNumber] ?? "skip"} onChange={event => setDecisions({ ...decisions, [row.rowNumber]: event.target.value as BucketImportDecision })} className="mt-1 min-h-11 w-full rounded-lg border px-2"><option value="skip">Skip</option>{row.existingPlayerId ? <option value="update">Update Existing</option> : null}<option value="import">Import Anyway</option></select></label> : <span className="font-semibold text-pitch">Valid</span>}</div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-lg font-bold">{value}</dd></div>; }
