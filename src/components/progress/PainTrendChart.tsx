"use client";

import { useSyncExternalStore } from "react";
import { painHistory as getPainHistory } from "@/lib/localSession";

const EMPTY: number[] = [];

const WIDTH = 280;
const HEIGHT = 120;
const PAD = 12;
const MAX_PAIN = 10;

const noopSubscribe = () => () => {};

function toPoint(value: number, index: number, count: number) {
  const x = PAD + (index / (count - 1)) * (WIDTH - PAD * 2);
  const y = PAD + (1 - value / MAX_PAIN) * (HEIGHT - PAD * 2);
  return { x, y };
}

export function PainTrendChart() {
  const history = useSyncExternalStore(
    noopSubscribe,
    getPainHistory,
    () => EMPTY
  );

  // One point cannot be a trend, and drawing a flat line from a single
  // check-in would imply a history the user does not have.
  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-mist bg-white/60 p-4">
        <h3 className="font-sans text-sm font-semibold text-ink">Pain trend</h3>
        <p className="mt-2 font-sans text-sm text-ink/60">
          {history.length === 0
            ? "Log a pain check-in on Today to start tracking this."
            : "One check-in logged. The trend appears from your second one."}
        </p>
      </div>
    );
  }

  const points = history.map((v, i) => toPoint(v, i, history.length));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${HEIGHT - PAD} L${points[0].x},${HEIGHT - PAD} Z`;

  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-sm font-semibold text-ink">Pain trend</h3>
        <span className="font-mono text-xs text-moss">
          {first} → {last} over {history.length} check-ins
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Pain trend from ${first} to ${last} out of 10 across ${history.length} check-ins`}
      >
        <defs>
          <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4B7A63" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4B7A63" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#painFill)" />
        <path d={linePath} fill="none" stroke="#4B7A63" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#4B7A63" />
        ))}
      </svg>
    </div>
  );
}
