export function LoadingState() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading content">
      <div className="h-48 rounded-3xl bg-slate-200 sm:h-64" />
      <div className="mt-8 h-6 w-40 rounded-lg bg-slate-200" />
      <div className="mt-4 h-72 rounded-3xl bg-slate-200" />
    </div>
  );
}
