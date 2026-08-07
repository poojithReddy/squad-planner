import { LoadingState } from "@/components/feedback/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <LoadingState />
    </div>
  );
}
