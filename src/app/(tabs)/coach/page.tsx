import Link from "next/link";
import { PoseCoach } from "@/components/coach/PoseCoach";
import { HoldCoach } from "@/components/coach/HoldCoach";
import { getExerciseBySlug, SUPPORTED_COACH_SLUG } from "@/data/exercises";
import { getMobilityExercise, mobilityExercises } from "@/data/mobilityExercises";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { exercise: slug } = await searchParams;
  const requested = slug ? getExerciseBySlug(slug) : undefined;
  const mobility = slug ? getMobilityExercise(slug) : undefined;
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

      {mobility?.hold ? (
        <HoldCoach config={mobility.hold} />
      ) : mobility ? (
        <div className="px-5 pt-6">
          <div className="rounded-2xl border border-mist bg-white/60 p-5">
            <h2 className="font-sans text-sm font-semibold text-ink">{mobility.name}</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink/70">{mobility.position}</p>
            <ul className="mt-3 space-y-2">
              {mobility.cues.map((cue) => (
                <li key={cue} className="font-sans text-sm text-ink/70">
                  • {cue}
                </li>
              ))}
            </ul>
            {mobility.cameraNote && (
              <p className="mt-4 rounded-xl bg-mist/60 px-3 py-2 font-sans text-xs leading-relaxed text-ink/60">
                {mobility.cameraNote}
              </p>
            )}
            <Link
              href="/coach"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2.5 font-sans text-sm font-semibold text-paper transition hover:opacity-90"
            >
              Back to Coach
            </Link>
          </div>
        </div>
      ) : isSupported ? (
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

      {!mobility && (
        <div className="mt-6 space-y-2 px-5 pb-8">
          <h2 className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
            Hold &amp; stretch exercises
          </h2>
          {mobilityExercises.map((exercise) => (
            <Link
              key={exercise.slug}
              href={`/coach?exercise=${exercise.slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-mist bg-white/60 px-4 py-3 transition hover:border-moss/40"
            >
              <span className="font-sans text-sm font-medium text-ink">{exercise.name}</span>
              {exercise.hold ? (
                <span className="shrink-0 rounded-full bg-moss/15 px-2 py-1 font-sans text-[10px] font-semibold tracking-wide text-moss uppercase">
                  Coach
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-mist px-2 py-1 font-sans text-[10px] font-semibold tracking-wide text-ink/40 uppercase">
                  Cues only
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
