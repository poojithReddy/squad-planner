import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[65vh] max-w-7xl place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-pitch">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500">This part of the tournament workspace is not available.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-pitch px-5 text-sm font-semibold text-white hover:bg-pitch-dark">Back to overview</Link>
      </div>
    </div>
  );
}
