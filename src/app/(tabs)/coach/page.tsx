import Link from "next/link";
import { PoseCoach } from "@/components/coach/PoseCoach";
import { getExerciseBySlug, SUPPORTED_COACH_SLUG } from "@/data/exercises";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { exercise: slug } = await searchParams;
  const requested = slug ? getExerciseBySlug(slug) : undefined;
  const isSupported = !slug || slug === SUPPORTED_COACH_SLUG;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-5 pt-8">
        <div>
          <h1 className="font-display text-3xl">Coach</h1>
          <p className="mt-1 font-sans text-sm text-ink/60">
            Live form feedback while you exercise — free, no account needed.
          </p>
        </div>
      </div>

      {isSupported ? (
        <PoseCoach />
      ) : (
        <div className="px-5 pt-6">
          <div className="rounded-2xl border border-mist bg-white/60 p-5 text-center">
            <p className="font-sans text-sm text-ink/70">
              Live camera tracking for{" "}
              <span className="font-semibold text-ink">
                {requested?.name ?? "this exercise"}
              </span>{" "}
              isn&apos;t built yet.
            </p>
            <p className="mt-1 font-sans text-xs text-ink/50">
              Heel Slides is the current working demo — try that one instead.
            </p>
            <Link
              href="/coach"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2.5 font-sans text-sm font-semibold text-paper transition hover:opacity-90"
            >
              Try Heel Slides Coach
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
