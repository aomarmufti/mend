import { PoseCoach } from "@/components/coach/PoseCoach";

export default function CoachPage() {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-5 pt-8">
        <div>
          <h1 className="font-display text-3xl">Coach</h1>
          <p className="mt-1 font-sans text-sm text-ink/60">
            Live form feedback while you exercise.
          </p>
        </div>
        <span className="rounded-full bg-amber px-2.5 py-1 font-sans text-xs font-bold tracking-wide text-ink">
          PRO
        </span>
      </div>

      <PoseCoach />
    </div>
  );
}
