import { PainTrendChart } from "@/components/progress/PainTrendChart";
import { ArrowUpIcon } from "@/components/icons";
import { SessionHistory } from "@/components/progress/SessionHistory";
import { ConditionBanner } from "@/components/ConditionBanner";

export default function ProgressPage() {
  return (
    <div className="space-y-5 px-5 pt-8">
      <h1 className="font-display text-3xl">Progress</h1>

      <ConditionBanner />

      <SessionHistory />

      <PainTrendChart />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-mist bg-white/60 p-4">
          <p className="font-sans text-xs text-ink/50">Adherence</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-pine">
            86<span className="text-sm text-ink/40">%</span>
          </p>
          <p className="mt-0.5 font-sans text-xs text-ink/50">last 4 weeks</p>
        </div>

        <div className="rounded-2xl border border-mist bg-white/60 p-4">
          <p className="font-sans text-xs text-ink/50">AKPS score</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="font-mono text-2xl font-semibold text-pine">78</p>
            <span className="flex items-center gap-0.5 rounded-full bg-moss/15 px-1.5 py-0.5 font-mono text-xs font-medium text-moss">
              <ArrowUpIcon className="h-3 w-3" />
              12
            </span>
          </div>
          <p className="mt-0.5 font-sans text-xs text-ink/50">out of 100</p>
        </div>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center rounded-xl border border-pine bg-white/60 py-3 font-sans text-sm font-semibold text-pine transition hover:bg-pine hover:text-paper"
      >
        Share with clinician
      </button>

      <p className="font-sans text-[11px] text-ink/40">
        AKPS: Anterior Knee Pain Scale, a standard self-reported function score
        for PFPS. Figures shown are illustrative demo data.
      </p>
    </div>
  );
}
