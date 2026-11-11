import Link from "next/link";
import { LockIcon, Pill, TickDot } from "@/components/ui/kit";
import { MODE_LABEL, type CatalogExercise } from "@/data/catalog";

export function ExerciseRow({
  exercise,
  done,
  locked,
  from = "plan",
}: {
  exercise: CatalogExercise;
  done: boolean;
  locked: boolean;
  from?: string;
}) {
  return (
    <Link
      href={locked ? "#unlock" : `/exercise/${exercise.slug}?from=${from}`}
      className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(60,100,120,0.10)]"
    >
      {locked ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7EDF0] text-ink/40">
          <LockIcon />
        </span>
      ) : (
        <TickDot done={done} />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-sans text-sm font-bold ${locked ? "text-ink/50" : ""}`}>
          {exercise.name}
        </span>
        <span className="block truncate font-sans text-[11px] text-ink/50">{exercise.doseLine}</span>
      </span>
      <Pill tone={exercise.mode === "camera" ? "ok" : "soft"} className="text-[10px]">
        {MODE_LABEL[exercise.mode]}
      </Pill>
    </Link>
  );
}
