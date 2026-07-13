"use client";

import { useSyncExternalStore } from "react";
import { currentStreak } from "@/lib/localSession";

const noopSubscribe = () => () => {};

export function StreakBadge() {
  const streak = useSyncExternalStore(noopSubscribe, currentStreak, () => null);

  return (
    <div className="flex flex-col items-center rounded-xl border border-mist bg-white/60 px-3 py-1.5">
      <span className="font-mono text-lg font-semibold text-amber">
        {streak ?? "–"}
      </span>
      <span className="font-sans text-[10px] text-ink/50">day streak</span>
    </div>
  );
}
