"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SetupHeader } from "@/components/flow/SetupHeader";
import { Card, btnPrimary } from "@/components/ui/kit";
import { areaLowerLabel } from "@/data/catalog";
import { setBaselinePain } from "@/lib/profile";
import { logPain } from "@/lib/localSession";

const WORDS = ["No pain", "Mild", "Mild", "Mild", "Moderate", "Moderate", "Moderate", "Severe", "Severe", "Severe", "Worst imaginable"];

/** Setup step 3: today's pain, so Progress has a real starting point to compare against. */
export function PainStep({
  conditionSlug,
  areaSlug,
  areaLabel,
  adding,
}: {
  conditionSlug: string;
  areaSlug: string;
  areaLabel: string;
  adding: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(null);
  const q = `?c=${conditionSlug}${adding ? "&add=1" : ""}`;

  const next = () => {
    if (value !== null) {
      setBaselinePain(value);
      logPain(value);
    }
    router.push(`/start/plan${q}`);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <SetupHeader
        step={3}
        back={`/start/${areaSlug}${adding ? "?add=1" : ""}`}
        title={`How is your ${areaLowerLabel(areaLabel)} today?`}
        subtitle="0 is no pain, 10 is the worst you can imagine. This is your starting point."
      />

      <Card className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-sm font-bold text-ink/60">
            {value === null ? "Tap a number" : WORDS[value]}
          </span>
          <span className="font-display text-4xl font-extrabold text-mint-deep">
            {value ?? "–"}
            <span className="text-base text-ink/35">/10</span>
          </span>
        </div>
        <div className="mt-4 grid grid-cols-11 gap-1" role="radiogroup" aria-label="Pain today, 0 to 10">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === i}
              onClick={() => setValue(i)}
              className={`aspect-square rounded-full font-sans text-xs font-extrabold transition ${
                value === i ? "bg-mint-deep text-white" : "bg-chip text-ink/60"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex-1" />
      <button type="button" onClick={next} disabled={value === null} className={`${btnPrimary} mt-6`}>
        Continue
      </button>
      <button
        type="button"
        onClick={() => router.push(`/start/plan${q}`)}
        className="mt-3 font-sans text-xs font-semibold text-ink/50"
      >
        Skip for now
      </button>
    </div>
  );
}
