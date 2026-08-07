import Link from "next/link";

const links = [
  ["", "Dashboard"],
  ["players", "Players"],
  ["buckets", "Buckets"],
  ["planning", "Planning"],
  ["auction", "Auction"],
  ["squad", "Squad"],
] as const;

export function TeamNav({ teamId }: { teamId: string }) {
  return (
    <nav aria-label="Team navigation" className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {links.map(([path, label]) => <Link key={label} href={`/teams/${teamId}${path ? `/${path}` : ""}`} className="min-h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:border-pitch hover:text-pitch">{label}</Link>)}
      {['Tournament', 'Volunteer Duties'].map((label) => <span key={label} className="min-h-11 shrink-0 cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400" title="Coming soon">{label}</span>)}
    </nav>
  );
}
