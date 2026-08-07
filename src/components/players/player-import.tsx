"use client";

import { useMemo, useState, useTransition } from "react";
import { readSheet } from "read-excel-file/browser";
import Papa from "papaparse";

import { confirmImport, validateImport } from "@/app/(protected)/teams/[teamId]/players/import/actions";
import { IMPORT_FIELDS, IMPORT_LABELS, type DuplicateDecision, type ImportField, type ImportRow, type ValidatedImportRow } from "@/types/player-import";

type CellValue = string | number | boolean | Date | null;

export function PlayerImport({ teamId }: { teamId: string }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<CellValue[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [validated, setValidated] = useState<ValidatedImportRow[]>([]);
  const [decisions, setDecisions] = useState<Record<number, DuplicateDecision>>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const mappedRows = useMemo(() => rawRows.map((row, index) => {
    const entries = IMPORT_FIELDS.map(field => [field, String(row[mapping[field] ?? -1] ?? "").trim()]);
    return Object.fromEntries([...entries, ["rowNumber", index + 2]]) as ImportRow;
  }), [rawRows, mapping]);

  async function fileSelected(file: File) {
    setMessage(""); setValidated([]);
    try {
      let matrix: CellValue[][] = [];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "xlsx") matrix = await readSheet(file) as CellValue[][];
      else if (extension === "csv") matrix = await new Promise((resolve, reject) => Papa.parse<CellValue[]>(file, { skipEmptyLines: true, complete: result => resolve(result.data), error: reject }));
      else throw new Error(extension === "xls" ? "Legacy .xls is not supported. Save it as .xlsx or .csv and try again." : "Choose an .xlsx or .csv file.");
      if (matrix.length < 2) throw new Error("The first worksheet must contain a header row and at least one player.");
      const detected = matrix[0].map(value => String(value ?? "").trim());
      setHeaders(detected);
      setRawRows(matrix.slice(1).filter(row => row.some(cell => String(cell ?? "").trim())));
      const auto: Partial<Record<ImportField, number>> = {};
      for (const field of IMPORT_FIELDS) {
        const wanted = IMPORT_LABELS[field].toLowerCase().replace(/[^a-z]/g, "");
        const found = detected.findIndex(header => header.toLowerCase().replace(/[^a-z]/g, "") === wanted);
        if (found >= 0) auto[field] = found;
      }
      setMapping(auto);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read the file."); }
  }

  function preview() {
    if (mapping.name === undefined) { setMessage("Map a spreadsheet column to Player Name."); return; }
    startTransition(async () => {
      const result = await validateImport(teamId, mappedRows);
      setValidated(result.rows); setMessage(result.error ?? "");
      setDecisions(Object.fromEntries(result.rows.filter(row => row.existingPlayerId).map(row => [row.rowNumber, "skip"])));
    });
  }
  function confirm() { startTransition(async () => { const result = await confirmImport(teamId, validated, decisions); setMessage(result.message); }); }
  const invalid = validated.filter(row => row.errors.length);

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">1. Choose file</h2><p className="mt-2 text-sm text-slate-500">The first worksheet is read in your browser. The source file is never uploaded or stored.</p><input type="file" accept=".xlsx,.xls,.csv" onChange={event => event.target.files?.[0] && fileSelected(event.target.files[0])} className="mt-5 block w-full rounded-xl border border-slate-300 p-3" /></section>
    {headers.length ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">2. Map columns</h2><p className="mt-2 text-sm text-slate-500">Detected {headers.length} headers and {rawRows.length} data rows. Only Player Name is required.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{IMPORT_FIELDS.map(field => <label key={field} className="text-sm font-semibold">{IMPORT_LABELS[field]}{field === "name" ? " *" : ""}<select value={mapping[field] ?? ""} onChange={event => setMapping({ ...mapping, [field]: event.target.value === "" ? undefined : Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"><option value="">Do not import</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Column ${index + 1}`}</option>)}</select></label>)}</div><button onClick={preview} disabled={isPending} className="mt-5 min-h-11 rounded-xl bg-ink px-5 font-bold text-white disabled:opacity-60">{isPending ? "Validating…" : "Validate and preview"}</button></section> : null}
    {validated.length ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">3. Review and confirm</h2><p className={`mt-2 text-sm font-semibold ${invalid.length ? "text-red-700" : "text-pitch"}`}>{invalid.length ? `${invalid.length} invalid row(s) must be fixed in the source file or mapping.` : `${validated.length} rows are ready.`}</p><div className="mt-4 max-h-[30rem] space-y-3 overflow-auto">{validated.map(row => <article key={row.rowNumber} className={`rounded-xl border p-4 ${row.errors.length ? "border-red-200 bg-red-50" : "border-slate-200"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold">Row {row.rowNumber}: {row.name || "Unnamed player"}</p><p className="mt-1 text-sm text-slate-500">{row.role || "No role"} · Expected {row.expectedPrice || "0"}</p>{row.errors.map(error => <p key={error} className="mt-1 text-sm text-red-700">{error}</p>)}</div>{row.existingPlayerId ? <label className="text-sm font-semibold">Duplicate action<select value={decisions[row.rowNumber] ?? "skip"} onChange={event => setDecisions({ ...decisions, [row.rowNumber]: event.target.value as DuplicateDecision })} className="mt-1 min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-3"><option value="skip">Skip</option><option value="replace">Replace/update existing</option><option value="import">Import anyway</option></select></label> : null}</div></article>)}</div><button onClick={confirm} disabled={isPending || invalid.length > 0} className="mt-5 min-h-12 rounded-xl bg-pitch px-6 font-bold text-white disabled:opacity-40">{isPending ? "Importing…" : "Confirm import"}</button></section> : null}
    {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-700">{message}</p> : null}
  </div>;
}
