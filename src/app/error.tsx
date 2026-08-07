"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[65vh] w-full max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-xl font-bold text-red-700" aria-hidden="true">!</div>
        <h1 className="mt-5 text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We could not load this part of Squad Planner. Try again, or return later.
        </p>
        <button type="button" onClick={retry} className="mt-6 min-h-11 rounded-xl bg-pitch px-5 py-2.5 text-sm font-semibold text-white hover:bg-pitch-dark">
          Try again
        </button>
        <Link href="/dashboard" className="ml-3 inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-semibold">Return to Dashboard</Link>
      </div>
    </div>
  );
}
