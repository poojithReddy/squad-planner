import Link from "next/link";

const items = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Teams", href: "/teams", icon: "teams" },
  { label: "Auction", href: "/auction", icon: "auction" },
  { label: "Fixtures", href: "/fixtures", icon: "calendar" },
];

export function MobileNavigation() {
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item, index) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={index === 0 ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.68rem] font-semibold ${
                index === 0 ? "bg-pitch/10 text-pitch" : "text-slate-500"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z",
    teams: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-2-11.96a4 4 0 0 1 0 7.75",
    auction: "m14 5 5 5M12 7l5 5m-9.5 1.5 3 3L5 22H2v-3l5.5-5.5ZM15 4l2-2 5 5-2 2",
    calendar: "M6 2v4m12-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z",
  };

  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
