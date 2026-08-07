import Link from "next/link";

export function Brand({ href = "/", compact = false, inverted = false }: { href?: string; compact?: boolean; inverted?: boolean }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2.5 rounded-xl" aria-label="Squad Planner home">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${inverted ? "bg-white/10 text-lime" : "bg-pitch text-white"}`} aria-hidden="true">
        <BrandMark />
      </span>
      {!compact ? <span className={`text-base font-extrabold tracking-[-0.025em] ${inverted ? "text-white" : "text-ink"}`}>Squad Planner</span> : null}
    </Link>
  );
}

export function BrandMark() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m7 4 10 16M10 3l2 4M14 17l2 4" strokeLinecap="round"/><circle cx="5" cy="17" r="2.2" fill="currentColor" stroke="none"/></svg>;
}
