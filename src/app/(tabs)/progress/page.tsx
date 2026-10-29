import { PainTrendChart } from "@/components/progress/PainTrendChart";
import { AdherenceStat } from "@/components/progress/AdherenceStat";
import { SessionHistory } from "@/components/progress/SessionHistory";
import { ConditionBanner } from "@/components/ConditionBanner";

export default function ProgressPage() {
  return (
    <div className="space-y-5 px-5 pt-8">
      <h1 className="font-display text-3xl">Progress</h1>

      <ConditionBanner />

      <SessionHistory />

      <PainTrendChart />

      <AdherenceStat />

      <button
        type="button"
        className="flex w-full items-center justify-center rounded-xl border border-pine bg-white/60 py-3 font-sans text-sm font-semibold text-pine transition hover:bg-pine hover:text-paper"
      >
        Share with clinician
      </button>

      <p className="font-sans text-[11px] text-ink/45">
        Everything on this screen is from your own logged sessions and check-ins.
        Nothing here is sample data.
      </p>
    </div>
  );
}
