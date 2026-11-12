"use client";

import { useState, useSyncExternalStore } from "react";
import { Card, btnPrimary } from "@/components/ui/kit";
import { logPain, todaysPain } from "@/lib/localSession";
import { subscribe } from "@/lib/store";

function labelFor(value: number): string {
  if (value === 0) return "No pain";
  if (value <= 3) return "Mild";
  if (value <= 6) return "Moderate";
  return "Severe";
}

export function PainCheckIn({ area, onDone }: { area: string; onDone?: () => void }) {
  const stored = useSyncExternalStore(subscribe, todaysPain, () => null);
  const [value, setValue] = useState<number>(stored ?? 3);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-sm font-bold">How is your {area} today?</span>
        <span className="font-display text-2xl font-extrabold text-mint-deep">
          {value}
          <span className="text-sm text-ink/35">/10</span>
        </span>
      </div>
      <p className="font-sans text-xs text-ink/55">{labelFor(value)}</p>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-3 w-full accent-[#2FA67F]"
        aria-label="Pain level, 0 to 10"
      />
      <div className="flex justify-between font-sans text-[10px] text-ink/40">
        <span>0 none</span>
        <span>10 worst</span>
      </div>
      <button
        type="button"
        onClick={() => {
          logPain(value);
          onDone?.();
        }}
        className={`${btnPrimary} mt-3 py-2.5`}
      >
        {stored === null ? "Log check-in" : "Update today's check-in"}
      </button>
    </Card>
  );
}
