"use client";

import { useSyncExternalStore } from "react";
import { weekAdherencePct } from "@/lib/localSession";

const noopSubscribe = () => () => {};

/**
 * Adherence computed from the user's own completed days. Shows a dash rather
 * than a number until there is something real to divide — a percentage
 * invented before the first session is the kind of figure a clinician would
 * (rightly) stop trusting the rest of the screen over.
 */
export function AdherenceStat() {
  const pct = useSyncExternalStore(noopSubscribe, weekAdherencePct, () => null);

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-4">
      <p className="font-sans text-xs text-ink/55">Adherence</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-pine">
        {pct === null ? "–" : pct}
        {pct !== null && <span className="text-sm text-ink/45">%</span>}
      </p>
      <p className="mt-0.5 font-sans text-xs text-ink/55">
        {pct === null ? "No sessions logged yet" : "last 7 days"}
      </p>
    </div>
  );
}
