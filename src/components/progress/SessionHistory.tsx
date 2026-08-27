"use client";

import { useState, useSyncExternalStore } from "react";
import {
  NO_RECORDS,
  groupByDay,
  recordsSnapshot,
  summarise,
} from "@/lib/exerciseLog";

const noopSubscribe = () => () => {};

type Range = 7 | 30 | 0;

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: "Week" },
  { value: 30, label: "Month" },
  { value: 0, label: "All" },
];

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function SessionHistory() {
  const [range, setRange] = useState<Range>(7);
  // localStorage is unavailable during the server render, so that pass sees an
  // empty log and the client fills it in on hydration.
  const records = useSyncExternalStore(
    noopSubscribe,
    () => recordsSnapshot(range),
    () => NO_RECORDS,
  );

  const summary = summarise(records);
  const days = groupByDay(records);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-sm font-semibold text-ink">
          Session history
        </h2>
        <div className="flex gap-1 rounded-lg border border-mist bg-white/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-md px-2.5 py-1 font-sans text-xs font-medium transition ${
                range === r.value
                  ? "bg-pine text-paper"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat value={summary.sessions} label="Sessions" />
        <Stat value={summary.reps} label="Reps" />
        <Stat value={summary.sets} label="Sets" />
        <Stat
          value={summary.avgScore === null ? "–" : `${summary.avgScore}%`}
          label="Avg form"
        />
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-mist bg-white/60 p-5">
          <p className="font-sans text-sm text-ink/60">
            No sessions logged in this period yet.
          </p>
          <p className="mt-1 font-sans text-xs text-ink/45">
            Reps and sets are recorded automatically when you finish a session
            in the Coach tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day.date}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
                  {day.label}
                </h3>
                <span className="font-mono text-[11px] text-ink/45">
                  {day.totalReps} reps · {day.totalSets} sets
                </span>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {day.records.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-mist bg-white/60 px-3.5 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-sans text-sm font-medium text-ink">
                        {r.exerciseName}
                      </p>
                      {r.avgScore !== null && (
                        <span className="shrink-0 font-mono text-xs font-semibold text-pine">
                          {r.avgScore}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-ink/45">
                      {r.reps} reps · {r.sets} {r.sets === 1 ? "set" : "sets"} ·{" "}
                      {formatDuration(r.durationMs)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-mist bg-white/60 px-2 py-2.5 text-center">
      <p className="font-mono text-lg font-semibold text-pine">{value}</p>
      <p className="font-sans text-[10px] text-ink/50">{label}</p>
    </div>
  );
}
