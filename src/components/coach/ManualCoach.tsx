"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogExercise } from "@/data/catalog";
import { logExercise, type SetDetail } from "@/lib/exerciseLog";
import { readActiveConditionSlug } from "@/lib/activeCondition";
import { markCompletedToday } from "@/lib/localSession";
import { buzz, speak, stopSpeaking, tone } from "@/components/coach/coachVoice";
import { Card, Ring, btnPrimary, btnSecondary } from "@/components/ui/kit";
import type { CoachResult } from "@/components/coach/HoldCoach";

/** Shortest timed hold that still counts when stopped early, matching the camera coach. */
const MIN_PARTIAL_SEC = 5;

/**
 * Doing an exercise without the camera: a hold timer, or a rep counter.
 *
 * Nothing here is measured, so everything it records is marked self-reported
 * and carries no form score. It is still a real record of a real session,
 * which is why it exists at all — an isometric hold has nothing for a camera
 * to see, and plenty of people will not want to prop up a phone every time.
 */
export function ManualCoach({
  exercise,
  onFinish,
  onExit,
  exitHref = "/plan",
}: {
  exercise: CatalogExercise;
  onFinish?: (result: CoachResult) => void;
  onExit?: () => void;
  exitHref?: string;
}) {
  const router = useRouter();
  const dose = exercise.manual;
  const holdSec = dose.kind === "hold" ? dose.holdSec : (dose.holdSec ?? 0);
  const target = dose.kind === "hold" ? dose.sets : dose.reps;
  const unit = dose.kind === "hold" ? "Set" : "Rep";
  const timed = holdSec > 0;

  const [sets, setSets] = useState<SetDetail[]>([]);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());
  const spokenRef = useRef<number | null>(null);

  const elapsed = runningSince === null ? 0 : Math.min(holdSec, (now - runningSince) / 1000);


  const bank = (heldSec: number, partial: boolean) => {
    setSets((s) => [...s, { heldMs: Math.round(heldSec * 1000), form: null, partial: partial || undefined }]);
    setRunningSince(null);
    spokenRef.current = null;
    tone(880, 160);
    buzz(100);
  };

  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = sets.length;
  }, [sets.length]);

  // The clock ticks here rather than in render, so banking a finished hold
  // and speaking the countdown happen once each, outside React's render.
  useEffect(() => {
    if (runningSince === null || !timed) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const el = (t - runningSince) / 1000;
      const left = Math.ceil(holdSec - el);
      if (el >= holdSec) {
        window.clearInterval(id);
        bank(holdSec, false);
        speak(countRef.current + 1 >= target ? "Done. That's all of them." : "Done. Rest, then go again.");
      } else if (left <= 3 && left > 0 && spokenRef.current !== left) {
        spokenRef.current = left;
        speak(String(left));
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [runningSince, timed, holdSec, target]);

  const finish = () => {
    stopSpeaking();
    const durationMs = Date.now() - startedAt;
    const best = Math.max(0, ...sets.map((s) => s.heldMs));
    logExercise({
      conditionSlug: readActiveConditionSlug(),
      exerciseSlug: exercise.slug,
      exerciseName: exercise.name,
      reps: sets.length,
      sets: dose.kind === "hold" ? sets.length : 1,
      durationMs,
      avgScore: null,
      selfReported: true,
      partialReps: sets.filter((s) => s.partial).length || undefined,
      setDetails: sets,
      bestHoldMs: best || undefined,
    });
    if (sets.length > 0) markCompletedToday();
    const result: CoachResult = { reps: sets.length, partials: 0, sets, durationMs };
    if (onFinish) onFinish(result);
    else router.push(exitHref);
  };

  const exit = () => {
    stopSpeaking();
    if (onExit) onExit();
    else router.push(exitHref);
  };

  const complete = sets.length >= target;
  const pct = timed ? (elapsed / holdSec) * 100 : (sets.length / target) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-gradient-to-b from-[#F3F8F4] to-[#EAF3FB]">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <button type="button" onClick={exit} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow">
            ×
          </button>
          <span className="font-sans text-sm font-extrabold">{exercise.name}</span>
          <span className="font-sans text-xs font-bold text-ink/50">
            {unit} {Math.min(sets.length + 1, target)} of {target}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <Ring pct={pct} size={190} stroke={12}>
            {timed ? `${Math.ceil(holdSec - elapsed)}s` : sets.length}
          </Ring>
          <p className="mt-4 text-center font-sans text-sm text-ink/60">
            {complete
              ? "All done. Save when you're ready."
              : runningSince !== null
                ? exercise.cues[0]
                : timed
                  ? `Get into position, then start the ${holdSec} second ${dose.kind === "hold" ? "hold" : "rep"}.`
                  : "Tap once for every rep you do."}
          </p>
        </div>

        {sets.length > 0 && (
          <Card className="mb-3 flex flex-wrap gap-1.5 p-3">
            {sets.map((s, i) => (
              <span key={i} className="rounded-full bg-success-soft px-2.5 py-1 font-sans text-[11px] font-bold text-success">
                {unit} {i + 1}
                {timed ? `: ${Math.round(s.heldMs / 1000)}s` : " ✓"}
              </span>
            ))}
          </Card>
        )}

        {!complete &&
          (timed ? (
            runningSince === null ? (
              <button type="button" onClick={() => { setNow(Date.now()); setRunningSince(Date.now()); tone(660, 120); }} className={btnPrimary}>
                Start {dose.kind === "hold" ? "hold" : "rep"} {sets.length + 1}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (elapsed >= MIN_PARTIAL_SEC ? bank(elapsed, true) : setRunningSince(null))}
                className={btnSecondary}
              >
                {elapsed >= MIN_PARTIAL_SEC ? "Stop early (counts as partial)" : "Cancel"}
              </button>
            )
          ) : (
            <button type="button" onClick={() => bank(0, false)} className={btnPrimary}>
              Rep done
            </button>
          ))}

        <button
          type="button"
          onClick={finish}
          disabled={runningSince !== null}
          className={`${complete ? btnPrimary : "mt-3 w-full font-sans text-xs font-bold text-ink/55"} disabled:opacity-40`}
        >
          {complete ? (onFinish ? "Save and continue" : "Save") : sets.length > 0 ? "Finish and save" : "Skip"}
        </button>
        <p className="mt-3 text-center font-sans text-[11px] text-ink/40">
          Without the camera this is recorded as self-reported.
        </p>
      </div>
    </div>
  );
}
