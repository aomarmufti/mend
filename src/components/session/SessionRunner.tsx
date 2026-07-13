"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/data/exercises";
import { markCompletedToday } from "@/lib/localSession";
import { CheckIcon } from "@/components/icons";

export function SessionRunner({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-moss/15">
          <CheckIcon className="h-8 w-8 text-moss" />
        </span>
        <h1 className="mt-5 font-display text-3xl">Session complete.</h1>
        <p className="mt-2 font-sans text-sm text-ink/60">
          Nice work — that&apos;s today done. See you tomorrow.
        </p>
        <Link
          href="/today"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-pine py-3.5 font-sans text-sm font-semibold text-paper transition hover:opacity-90"
        >
          Back to Today
        </Link>
      </div>
    );
  }

  const exercise = exercises[index];
  const isLast = index === exercises.length - 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-8 pb-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/today")}
          className="font-sans text-sm text-ink/50"
        >
          ← Exit
        </button>
        <span className="font-mono text-xs text-ink/50">
          {index + 1} of {exercises.length}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full bg-moss transition-all"
          style={{ width: `${((index + 1) / exercises.length) * 100}%` }}
        />
      </div>

      <div className="mt-8 flex-1">
        <span className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
          {exercise.stage} stage
        </span>
        <h1 className="mt-1 font-display text-3xl">{exercise.name}</h1>
        <p className="mt-1 font-mono text-sm text-amber">{exercise.dosage}</p>

        <div className="mt-5 rounded-2xl border border-mist bg-white/60 p-4">
          <h3 className="font-sans text-sm font-semibold text-ink">Position</h3>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink/70">
            {exercise.position}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-mist bg-white/60 p-4">
          <h3 className="font-sans text-sm font-semibold text-ink">Cues</h3>
          <ul className="mt-2 space-y-2">
            {exercise.cues.map((cue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 font-sans text-sm text-ink/70"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                {cue}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (isLast) {
            markCompletedToday();
            setDone(true);
          } else {
            setIndex((i) => i + 1);
          }
        }}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-amber py-3.5 font-sans text-sm font-semibold text-ink transition hover:opacity-90"
      >
        {isLast ? "Finish session" : "Mark done — next exercise"}
      </button>
    </div>
  );
}
