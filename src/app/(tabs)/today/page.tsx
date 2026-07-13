import { exercisesByStage } from "@/data/exercises";
import { SessionCard } from "@/components/today/SessionCard";
import { PainSlider } from "@/components/today/PainSlider";
import { AdherenceDots } from "@/components/today/AdherenceDots";
import { StreakBadge } from "@/components/today/StreakBadge";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TodayPage() {
  const todaysExercises = exercisesByStage("Early");

  return (
    <div className="space-y-5 px-5 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-sm text-ink/60">{greeting()}, Azeem</p>
          <h1 className="mt-0.5 font-display text-3xl">
            Let&apos;s <span className="italic text-moss">mend</span> today.
          </h1>
        </div>
        <StreakBadge />
      </div>

      <SessionCard exercises={todaysExercises} />
      <PainSlider />
      <AdherenceDots />
    </div>
  );
}
