"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { DEFAULT_CONDITION_SLUG, getCondition } from "@/data/conditions";
import { readActiveConditionSlug } from "@/lib/activeCondition";

const noopSubscribe = () => () => {};

/**
 * The active condition lives in localStorage. The server snapshot is the
 * default condition, so the first paint matches what most users will see and
 * the client corrects it on hydration without a layout shift.
 */
export function useActiveCondition() {
  const slug = useSyncExternalStore(
    noopSubscribe,
    readActiveConditionSlug,
    () => DEFAULT_CONDITION_SLUG
  );
  return getCondition(slug) ?? getCondition(DEFAULT_CONDITION_SLUG)!;
}

export function ConditionBanner() {
  const condition = useActiveCondition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-mist bg-white/50 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="font-sans text-[10px] font-semibold tracking-wide text-ink/40 uppercase">
          Your programme
        </p>
        <p className="truncate font-sans text-sm font-semibold text-ink">
          {condition.name}
        </p>
      </div>
      <Link
        href="/start"
        className="shrink-0 rounded-lg border border-mist px-2.5 py-1.5 font-sans text-xs font-medium text-pine transition hover:bg-pine hover:text-paper"
      >
        Change
      </Link>
    </div>
  );
}

/**
 * Renders `children` only where the active condition has a sourced programme.
 * Everything else gets an honest explanation rather than a fabricated routine.
 */
export function ProgrammeGate({ children }: { children: React.ReactNode }) {
  const condition = useActiveCondition();

  if (condition.programme) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-5">
      <h2 className="font-sans text-sm font-semibold text-ink">
        {condition.name} — programme in development
      </h2>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink/65">
        {condition.summary}
      </p>
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink/65">
        We only ship exercise programmes transcribed from a clinical source.
        This one has not been sourced yet, so there is nothing here to
        prescribe — inventing sets and reps for a rehab protocol would be worse
        than showing you nothing.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/coach"
          className="flex items-center justify-center rounded-xl bg-pine py-3 font-sans text-sm font-semibold text-paper transition hover:opacity-90"
        >
          Try the camera coach anyway
        </Link>
        <Link
          href="/start/knee"
          className="flex items-center justify-center rounded-xl border border-mist py-3 font-sans text-sm font-semibold text-pine transition hover:bg-white"
        >
          Switch to a ready programme
        </Link>
      </div>
    </div>
  );
}
