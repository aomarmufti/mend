import Link from "next/link";
import type { Exercise } from "@/data/exercises";

export function ExerciseListItem({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      href={`/library/${exercise.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-mist bg-white/60 px-4 py-3 transition hover:border-moss/40"
    >
      <div>
        <p className="font-sans text-sm font-semibold text-ink">{exercise.name}</p>
        <p className="mt-0.5 font-mono text-xs text-ink/50">{exercise.dosage}</p>
      </div>
      {exercise.cameraCoach && (
        <span className="shrink-0 rounded-full bg-amber/15 px-2 py-1 font-sans text-[10px] font-semibold tracking-wide text-amber uppercase">
          Coach
        </span>
      )}
    </Link>
  );
}
