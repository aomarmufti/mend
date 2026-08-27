"use client";

import { useSyncExternalStore } from "react";
import { painHistory as getPainHistory } from "@/lib/localSession";

const BASELINE = [6, 5, 5, 4, 3, 3, 2];

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
    () => BASELINE
  );

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
          {first} → {last} over 7 sessions
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Pain trend declining from ${first} to ${last} out of 10`}
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
