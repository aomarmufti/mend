"use client";

import type { SetDetail } from "@/lib/exerciseLog";

/**
 * Where you are in the exercise, at a glance: every set (or rep) as a chip that is
 * ticked when done, shows its live time while it is the current one, and waits
 * greyed out when it is still to come. So at any moment you can see what has
 * counted, what is in progress, and how many are left.
 */
export function SetStrip({
  total,
  done,
  unit,
  liveSec,
  targetSec,
  paused,
  releasing = false,
}: {
  total: number;
  done: SetDetail[];
  unit: "Set" | "Rep";
  /** Seconds held so far in the current set. Null for rep exercises. */
  liveSec: number | null;
  targetSec: number | null;
  paused: boolean;
  /** The last set has just counted and they are still holding: let go before the next starts. */
  releasing?: boolean;
}) {
  const finished = done.length;
  const current = Math.min(finished + 1, total);
  const toGo = Math.max(0, total - finished - 1);
  const allDone = finished >= total;
  const compact = total > 6;

  return (
    <div className="rounded-2xl bg-night/70 px-3 py-2.5 backdrop-blur" aria-label={`${unit} ${current} of ${total}`}>
      <div className="flex items-baseline justify-between font-sans">
        <span className="text-sm font-extrabold text-white">
          {allDone ? `All ${total} ${unit.toLowerCase()}s done` : `${unit} ${current} of ${total}`}
        </span>
        <span className="text-[11px] font-bold text-white/65">
          {allDone ? "Well done" : toGo === 0 ? "Last one" : `${toGo} to go after this`}
        </span>
      </div>

      {compact ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < finished ? "bg-mint" : i === finished ? "bg-white ring-2 ring-mint" : "bg-white/25"
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: total }, (_, i) => {
            const d = done[i];
            const isCurrent = i === finished && !allDone;
            return (
              <div
                key={i}
                className={`flex h-12 flex-1 flex-col items-center justify-center rounded-xl font-sans ${
                  d
                    ? d.partial
                      ? "bg-amber-soft text-amber"
                      : "bg-mint text-night"
                    : isCurrent
                      ? `bg-white text-night ring-2 ${paused ? "ring-amber" : "ring-mint"}`
                      : "bg-white/15 text-white/55"
                }`}
              >
                <span className="text-sm leading-none font-extrabold">
                  {d ? (d.partial ? "~" : "✓") : isCurrent && releasing ? "–" : isCurrent && liveSec !== null ? `${liveSec}s` : i + 1}
                </span>
                <span className="mt-0.5 text-[10px] leading-none font-bold opacity-80">
                  {d
                    ? targetSec !== null
                      ? `${Math.round(d.heldMs / 1000)}s`
                      : "done"
                    : isCurrent
                      ? releasing
                        ? "release first"
                        : paused
                        ? "paused"
                        : targetSec !== null
                          ? `of ${targetSec}s`
                          : "now"
                      : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
