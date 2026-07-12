import { stageOrder, stageDescription, exercisesByStage } from "@/data/exercises";
import { ExerciseListItem } from "@/components/library/ExerciseListItem";

export default function LibraryPage() {
  return (
    <div className="space-y-7 px-5 pt-8">
      <div>
        <h1 className="font-display text-3xl">Library</h1>
        <p className="mt-1 font-sans text-sm text-ink/60">
          The NHS Lanarkshire PFPS programme, in three stages. Progress once
          the current stage feels easy — this isn&apos;t a fixed weekly
          schedule.
        </p>
      </div>

      {stageOrder.map((stage) => (
        <section key={stage} className="space-y-2.5">
          <div>
            <h2 className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
              {stage}
            </h2>
            <p className="font-sans text-xs text-ink/50">
              {stageDescription[stage]}
            </p>
          </div>
          <div className="space-y-2">
            {exercisesByStage(stage).map((exercise) => (
              <ExerciseListItem key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
