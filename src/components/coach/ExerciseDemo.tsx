"use client";

import { useEffect, useRef, useState } from "react";
import { getDemo, skeleton, stillTime, type Demo, type Skeleton, type Vec } from "@/components/coach/exerciseDemos";

/**
 * An animated demonstration of what an exercise should look like, for the
 * exercises that have no filmed clip. The figure is solved from joint
 * geometry in `exerciseDemos.ts`; this file only draws it.
 */

function seg(a: Vec, b: Vec) {
  return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
}

function Figure({ demo, s }: { demo: Demo; s: Skeleton }) {
  const emphasise = demo.highlight === "nearThigh" && s.target;
  return (
    <>
      {/* The resting leg first, flat and quiet, so the working leg sits on top. */}
      <line {...seg(s.hip, s.farKnee)} className="stroke-ink/20" strokeWidth="5" strokeLinecap="round" />
      <line {...seg(s.farKnee, s.farAnkle)} className="stroke-ink/20" strokeWidth="5" strokeLinecap="round" />
      {demo.foot && <line {...seg(s.farAnkle, s.farToe)} className="stroke-ink/20" strokeWidth="4" strokeLinecap="round" />}

      {/* Torso, head and arm. */}
      <line {...seg(s.hip, s.shoulder)} className="stroke-ink/35" strokeWidth="6" strokeLinecap="round" />
      <circle cx={s.head[0]} cy={s.head[1]} r="9" className="fill-ink/25" />
      <line {...seg(s.shoulder, s.elbow)} className="stroke-ink/30" strokeWidth="3.5" strokeLinecap="round" />
      <line {...seg(s.elbow, s.hand)} className="stroke-ink/30" strokeWidth="3.5" strokeLinecap="round" />

      {/* The working leg. */}
      {emphasise && (
        <line {...seg(s.hip, s.nearKnee)} className="stroke-amber/40" strokeWidth="13" strokeLinecap="round" />
      )}
      <line {...seg(s.hip, s.nearKnee)} className="stroke-moss" strokeWidth="5.5" strokeLinecap="round" />
      <line {...seg(s.nearKnee, s.nearAnkle)} className="stroke-moss" strokeWidth="5.5" strokeLinecap="round" />
      {demo.foot && <line {...seg(s.nearAnkle, s.nearToe)} className="stroke-moss" strokeWidth="4" strokeLinecap="round" />}

      <circle cx={s.hip[0]} cy={s.hip[1]} r="4.5" className="fill-pine" />
      <circle cx={s.nearKnee[0]} cy={s.nearKnee[1]} r="4.5" className="fill-moss" />
      <circle cx={s.nearAnkle[0]} cy={s.nearAnkle[1]} r="3.5" className="fill-moss" />
    </>
  );
}

export function ExerciseDemo({ slug, className = "", compact = false }: { slug: string; className?: string; compact?: boolean }) {
  const demo = getDemo(slug);
  // Start on the target position, so the server render, and anyone who prefers
  // reduced motion, sees the position the exercise is about rather than a
  // neutral rest pose.
  const [ms, setMs] = useState(() => (demo ? stillTime(demo) : 0));
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!demo) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const start = performance.now() - stillTime(demo) + 600;
    const tick = () => {
      setMs(performance.now() - start);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [demo]);

  if (!demo) return null;
  const s = skeleton(demo, ms);

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-mist bg-white/70">
        <svg
          viewBox="0 0 240 180"
          className="block aspect-[4/3] w-full"
          role="img"
          aria-label={`Animated demonstration: ${demo.title}. ${s.label}`}
        >
          {demo.props.map((p, i) => (
            <line key={i} {...{ x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 }} className="stroke-mist" strokeWidth="3" strokeLinecap="round" />
          ))}
          <Figure demo={demo} s={s} />
        </svg>

        {!compact && (
          <>
            <span className="absolute top-1.5 left-2 rounded-full bg-pine/90 px-2 py-0.5 font-sans text-[9px] font-semibold tracking-wide text-paper uppercase">
              Target movement
            </span>
            <span className="absolute top-1.5 right-2 rounded-full bg-white/80 px-2 py-0.5 font-sans text-[9px] font-semibold tracking-wide text-ink/50 uppercase">
              {demo.view}
            </span>
            <p className="absolute inset-x-2 bottom-1.5 rounded-lg bg-white/85 px-2 py-1 text-center font-sans text-[11px] leading-snug font-semibold text-ink/70">
              {s.label}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
