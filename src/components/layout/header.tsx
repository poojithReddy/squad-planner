import Link from "next/link";

const navigation = [
  { label: "Overview", href: "/" },
  { label: "Teams", href: "/teams" },
  { label: "Auction", href: "/auction" },
  { label: "Fixtures", href: "/fixtures" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-canvas/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-white px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Squad Planner home">
          <span className="grid size-9 place-items-center rounded-xl bg-pitch text-white shadow-sm" aria-hidden="true">
            <CricketMark />
          </span>
          <span className="text-base font-bold tracking-tight text-ink sm:text-lg">
            Squad Planner
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={index === 0 ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                index === 0
                  ? "bg-white text-pitch shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">Setup mode</span>
          <div className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-xs font-bold text-pitch" aria-label="Guest account">
            SP
          </div>
        </div>
      </div>
    </header>
  );
}

function CricketMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m7 4 10 16M10 3l2 4M14 17l2 4" strokeLinecap="round" />
      <circle cx="5" cy="17" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
