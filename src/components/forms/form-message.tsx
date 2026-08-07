import type { FormState } from "@/types/forms";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-xl px-4 py-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
      {state.message}
    </p>
  );
}
