import { exercisesByStage } from "@/data/exercises";
import { ConditionBanner, ProgrammeGate } from "@/components/ConditionBanner";
import { SessionCard } from "@/components/today/SessionCard";
import { PainSlider } from "@/components/today/PainSlider";
import { AdherenceDots } from "@/components/today/AdherenceDots";
import { StreakBadge } from "@/components/today/StreakBadge";
import { Greeting } from "@/components/today/Greeting";

export default function TodayPage() {
  const todaysExercises = exercisesByStage("Early");

  return (
    <div className="space-y-5 px-5 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-sm text-ink/60">
            <Greeting />, Azeem
          </p>
          <h1 className="mt-0.5 font-display text-3xl">
            Let&apos;s <span className="italic text-moss">mend</span> today.
          </h1>
        </div>
        <StreakBadge />
      </div>

      <ConditionBanner />

      <ProgrammeGate>
        <div className="space-y-5">
          <SessionCard exercises={todaysExercises} />
          <PainSlider />
          <AdherenceDots />
        </div>
      </ProgrammeGate>
    </div>
  );
}
