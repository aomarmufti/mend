"use client";

import { fill } from "@/data/getReady";
import { btnPrimary } from "@/components/ui/kit";

/**
 * The card before an exercise, and between legs: which leg, and exactly how to get into
 * position, in plain numbered steps. The camera keeps running behind it. Nothing counts
 * until "I'm ready" is tapped, and then the coach starts by itself once they are steady.
 */
export function GetReadyCard({
  title,
  steps,
  leg,
  chooseLeg,
  onLeg,
  cta,
  onReady,
}: {
  title: string;
  steps: string[];
  leg: "left" | "right";
  /** Show the left/right choice. Off when the leg is already decided (the second side). */
  chooseLeg: boolean;
  onLeg: (l: "left" | "right") => void;
  cta: string;
  onReady: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 max-h-[78%] overflow-y-auto rounded-[26px] bg-white p-4 text-ink shadow-[0_16px_40px_rgba(0,0,0,.4)]">
      <p className="font-display text-xl font-extrabold">{title}</p>
      {chooseLeg ? (
        <div className="mt-2.5" role="radiogroup" aria-label="Which leg first">
          <p className="font-sans text-xs font-bold text-ink/60">Which leg first?</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["left", "right"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={leg === l}
                onClick={() => onLeg(l)}
                className={`rounded-2xl py-2.5 font-sans text-sm font-extrabold capitalize ${leg === l ? "bg-mint-deep text-white" : "bg-chip text-ink"}`}
              >
                {l} leg
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-1 font-sans text-sm font-bold text-mint-deep">
          Now your <span className="uppercase">{leg}</span> leg
        </p>
      )}
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 font-sans text-[13px] leading-snug">
            <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-night text-[11px] font-extrabold text-white">
              {i + 1}
            </span>
            <span>{fill(s, leg)}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onReady} className={`${btnPrimary} mt-4 w-full`}>
        {cta}
      </button>
    </div>
  );
}
