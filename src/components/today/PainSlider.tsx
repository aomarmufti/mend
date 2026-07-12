"use client";

import { useState } from "react";

function labelFor(value: number): string {
  if (value === 0) return "No pain";
  if (value <= 3) return "Mild";
  if (value <= 6) return "Moderate";
  return "Severe";
}

export function PainSlider() {
  const [value, setValue] = useState(3);

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-sm font-semibold text-ink">
          Pain check-in
        </h3>
        <span className="font-mono text-2xl font-medium text-pine">
          {value}
          <span className="text-sm text-ink/40">/10</span>
        </span>
      </div>
      <p className="mt-0.5 font-sans text-xs text-ink/60">{labelFor(value)}</p>

      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-4 h-2 w-full appearance-none rounded-full bg-gradient-to-r from-moss via-amber to-coral accent-pine"
        aria-label="Pain level, 0 to 10"
      />
      <div className="mt-1 flex justify-between font-sans text-[10px] text-ink/40">
        <span>0 — none</span>
        <span>10 — worst</span>
      </div>
    </div>
  );
}
