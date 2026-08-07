import { EmptyState } from "@/components/feedback/empty-state";
import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="overflow-hidden rounded-3xl bg-ink px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10 lg:grid lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:gap-12 lg:px-12 lg:py-12">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime">
            Tournament command centre
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            Build your squad. Own the auction. Play to win.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
            Squad Planner brings team preparation, live auction decisions, and
            match-day coordination into one focused workspace.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:mt-0">
          <Stat label="Teams" value="—" />
          <Stat label="Players" value="—" />
          <Stat label="Fixtures" value="—" />
          <Stat label="Budget used" value="—" />
        </div>
      </section>

      <section aria-labelledby="teams-heading" className="mt-8 sm:mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-pitch">Your tournament</p>
            <h2 id="teams-heading" className="mt-1 text-2xl font-bold tracking-tight text-ink">
              Teams
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            Foundation preview
          </span>
        </div>

        <EmptyState
          title="Your teams will appear here"
          description="Team creation and member access are planned for the next product phase. The responsive workspace is ready for them."
        />
      </section>
    </div></AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-2xl font-bold text-lime">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}
