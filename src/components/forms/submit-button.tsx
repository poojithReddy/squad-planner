"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel = "Please wait…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-pitch-dark disabled:cursor-wait disabled:opacity-65">
      {pending ? pendingLabel : children}
    </button>
  );
}
