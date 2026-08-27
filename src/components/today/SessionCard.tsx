"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { Exercise } from "@/data/exercises";
import { isCompletedToday } from "@/lib/localSession";
import { CheckIcon } from "@/components/icons";

const noopSubscribe = () => () => {};

export function SessionCard({ exercises }: { exercises: Exercise[] }) {
  const completed = useSyncExternalStore(
    noopSubscribe,
    isCompletedToday,
    () => false
  );

  return (
    <div className="rounded-2xl bg-pine p-5 text-paper">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-medium tracking-wide text-paper/60 uppercase">
          Today&apos;s session
        </span>
        <span className="font-mono text-xs text-paper/60">
          {exercises.length} exercises · ~8 min
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {exercises.map((ex) => (
          <li key={ex.id} className="flex items-center gap-2 font-sans text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
            {ex.name}
          </li>
        ))}
      </ul>

      {completed ? (
        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-sans text-sm font-semibold text-paper">
          <CheckIcon className="h-4 w-4 text-moss" />
          Done for today
        </div>
      ) : (
        <Link
          href="/session"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-amber py-3 font-sans text-sm font-semibold text-ink transition hover:opacity-90"
        >
          Start session
        </Link>
      )}
    </div>
  );
}
