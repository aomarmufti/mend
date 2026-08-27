"use client";

import { useState, useSyncExternalStore } from "react";
import { logPain, todaysPain } from "@/lib/localSession";

const noopSubscribe = () => () => {};

function labelFor(value: number): string {
  if (value === 0) return "No pain";
  if (value <= 3) return "Mild";
  if (value <= 6) return "Moderate";
  return "Severe";
}

export function PainSlider() {
  const storedToday = useSyncExternalStore(noopSubscribe, todaysPain, () => null);

  const [value, setValue] = useState(3);
  const [syncedFrom, setSyncedFrom] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);

  // Adopt today's already-logged value once, the first time it becomes known
  // (e.g. after hydration reads localStorage) — not an effect, just a
  // render-time sync per https://react.dev/learn/you-might-not-need-an-effect.
  if (storedToday !== null && syncedFrom !== storedToday) {
    setSyncedFrom(storedToday);
    setValue(storedToday);
    setLogged(true);
  }

  function handleLog() {
    logPain(value);
    setSyncedFrom(value);
    setLogged(true);
  }

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
        onChange={(e) => {
          setValue(Number(e.target.value));
          setLogged(false);
        }}
        className="mt-4 h-2 w-full appearance-none rounded-full bg-gradient-to-r from-moss via-amber to-coral accent-pine"
        aria-label="Pain level, 0 to 10"
      />
      <div className="mt-1 flex justify-between font-sans text-[10px] text-ink/40">
        <span>0 — none</span>
        <span>10 — worst</span>
      </div>

      <button
        type="button"
        onClick={handleLog}
        disabled={logged}
        className="mt-3 w-full rounded-xl bg-pine py-2 font-sans text-xs font-semibold text-paper transition disabled:bg-moss/20 disabled:text-moss"
      >
        {logged ? "Logged for today" : "Log check-in"}
      </button>
    </div>
  );
}
