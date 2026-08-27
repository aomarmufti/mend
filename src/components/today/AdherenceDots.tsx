"use client";

import { useSyncExternalStore } from "react";
import { weekAdherence } from "@/lib/localSession";

type Day = { label: string; done: boolean; isToday: boolean };

const fallbackWeek: Day[] = [
  { label: "S", done: false, isToday: false },
  { label: "M", done: false, isToday: false },
  { label: "T", done: false, isToday: false },
  { label: "W", done: false, isToday: false },
  { label: "T", done: false, isToday: false },
  { label: "F", done: false, isToday: false },
  { label: "S", done: false, isToday: true },
];

const noopSubscribe = () => () => {};

export function AdherenceDots() {
  const week = useSyncExternalStore(
    noopSubscribe,
    weekAdherence,
    () => fallbackWeek
  );

  const doneCount = week.filter((d) => d.done).length;

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-sm font-semibold text-ink">This week</h3>
        <span className="font-mono text-xs text-ink/50">{doneCount}/7 days</span>
      </div>
      <div className="mt-3 flex justify-between">
        {week.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded-full ${
                day.done
                  ? "bg-moss"
                  : day.isToday
                    ? "bg-amber ring-2 ring-amber/40 ring-offset-2 ring-offset-paper"
                    : "bg-mist"
              }`}
            />
            <span className="font-sans text-[10px] text-ink/50">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
