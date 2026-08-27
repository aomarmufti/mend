"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An animated demonstration of what the movement should look like, shown
 * alongside the user's own camera feed.
 *
 * The knee is not drawn on a guessed path — the heel stays on the bed and
 * slides toward the hip, and the knee is solved as the intersection of the
 * thigh and shin circles, so the joint moves the way a real leg does.
 */

const HIP = { x: 96, y: 74 };
const THIGH = 40;
const SHIN = 40;
/** Heel travel, as a fraction of a fully extended leg. */
const MIN_REACH = 0.55;
const CYCLE_MS = 4200;

interface Pose {
  knee: { x: number; y: number };
  heel: { x: number; y: number };
  phase: "in" | "hold" | "out";
}

function solve(reach: number): { x: number; y: number } {
  // Distance from hip to heel along the bed.
  const d = Math.max(1, Math.min(THIGH + SHIN - 0.01, reach));
  // Standard two-circle intersection: `a` is the distance from the hip to the
  // point on the hip-heel line directly below the knee, `h` the knee's height
  // above it.
  const a = (d * d + THIGH * THIGH - SHIN * SHIN) / (2 * d);
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  return { x: HIP.x + a, y: HIP.y - h };
}

function poseAt(t: number): Pose {
  // Ease in and out of the hold so the demo does not snap at the extremes.
  const cycle = (t % CYCLE_MS) / CYCLE_MS;
  const eased = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  const reach = (THIGH + SHIN) * (1 - eased * (1 - MIN_REACH));

  const phase: Pose["phase"] =
    eased > 0.9 ? "hold" : cycle < 0.5 ? "in" : "out";

  return { knee: solve(reach), heel: { x: HIP.x + reach, y: HIP.y }, phase };
}

const PHASE_LABEL: Record<Pose["phase"], string> = {
  in: "Slide the heel in…",
  hold: "Hold at depth",
  out: "…and back out with control",
};

export function ReferenceFigure({ className = "" }: { className?: string }) {
  // Seeded mid-slide, so a frame that never animates — the server render, or a
  // viewer who prefers reduced motion — still shows a representative position
  // rather than a flat leg.
  const [pose, setPose] = useState<Pose>(() => poseAt(CYCLE_MS / 2));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const start = performance.now();
    const tick = () => {
      setPose(poseAt(performance.now() - start));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { knee, heel } = pose;
  const shoulder = { x: HIP.x - 42, y: HIP.y - 4 };
  const head = { x: shoulder.x - 14, y: shoulder.y - 3 };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-mist bg-white/70">
        <svg
          viewBox="0 0 200 100"
          className="h-full w-full"
          role="img"
          aria-label="Animated demonstration of a heel slide"
        >
          {/* the bed */}
          <line
            x1="8"
            y1={HIP.y + 8}
            x2="192"
            y2={HIP.y + 8}
            className="stroke-mist"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* torso and head */}
          <line
            x1={shoulder.x}
            y1={shoulder.y}
            x2={HIP.x}
            y2={HIP.y}
            className="stroke-ink/35"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={head.x} cy={head.y} r="7" className="fill-ink/25" />

          {/* the resting leg, drawn flat and quiet */}
          <line
            x1={HIP.x}
            y1={HIP.y + 4}
            x2={HIP.x + THIGH + SHIN}
            y2={HIP.y + 4}
            className="stroke-ink/15"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* the working leg */}
          <line
            x1={HIP.x}
            y1={HIP.y}
            x2={knee.x}
            y2={knee.y}
            className="stroke-moss"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={knee.x}
            y1={knee.y}
            x2={heel.x}
            y2={heel.y}
            className="stroke-moss"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <circle cx={HIP.x} cy={HIP.y} r="4.5" className="fill-pine" />
          <circle cx={knee.x} cy={knee.y} r="5" className="fill-moss" />
          <circle cx={heel.x} cy={heel.y} r="4" className="fill-moss" />

          {/* direction of heel travel */}
          <path
            d={`M ${heel.x + 10} ${HIP.y + 13} L ${heel.x + 22} ${HIP.y + 13}`}
            className="stroke-amber"
            strokeWidth="1.5"
            strokeLinecap="round"
            markerEnd="url(#demo-arrow)"
            opacity={pose.phase === "in" ? 0.9 : 0.25}
          />
          <defs>
            <marker
              id="demo-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="1"
              refY="3"
              orient="auto"
            >
              <path d="M6,3 L0,0 L0,6 Z" className="fill-amber" />
            </marker>
          </defs>
        </svg>

        <span className="absolute top-1.5 left-2 rounded-full bg-pine/90 px-2 py-0.5 font-sans text-[9px] font-semibold tracking-wide text-paper uppercase">
          Target movement
        </span>
      </div>

      <p className="mt-1.5 text-center font-sans text-[11px] text-ink/50">
        {PHASE_LABEL[pose.phase]}
      </p>
    </div>
  );
}
