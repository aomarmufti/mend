"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogExercise } from "@/data/catalog";
import { areaLowerLabel } from "@/data/catalog";
import { ExerciseIntro } from "@/components/exercise/ExerciseIntro";
import { ExerciseRunner } from "@/components/coach/ExerciseRunner";
import type { CoachResult } from "@/components/coach/HoldCoach";
import { PainCheckIn } from "@/components/today/PainCheckIn";
import { Card, ProgressBar, btnPrimary, eyebrow } from "@/components/ui/kit";
import { useHydrated } from "@/lib/profile";
import { logPain } from "@/lib/localSession";
import { shouldStop } from "@/lib/safety";
import { useActivePlan, type ActivePlan } from "@/lib/usePlan";
import { doneToday, useAllRecords } from "@/lib/progress";
import { LogoMark } from "@/components/brand/Logo";

export function SessionRunner() {
  const hydrated = useHydrated();
  const active = useActivePlan();
  const records = useAllRecords();
  const router = useRouter();

  const nothing = hydrated && (!active || active.usable.length === 0);
  useEffect(() => {
    if (nothing) router.replace("/today");
  }, [nothing, router]);

  if (!hydrated || !active || nothing) return <div className="min-h-screen" />;
  return <Session active={active} doneSlugs={doneToday(records)} />;
}

interface Outcome {
  exercise: CatalogExercise;
  result: CoachResult | null;
}

function Session({ active, doneSlugs }: { active: ActivePlan; doneSlugs: Set<string> }) {
  const router = useRouter();
  // Fixed at the start: resume with what is left today, or the whole session
  // again when everything is already done.
  const [list] = useState(() => {
    const left = active.usable.filter((e) => !doneSlugs.has(e.slug));
    return left.length ? left : active.usable;
  });
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState<null | "camera" | "manual">(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [painLogged, setPainLogged] = useState(false);
  const [asking, setAsking] = useState(false);
  const [midPain, setMidPain] = useState(3);

  const advance = (result: CoachResult | null) => {
    const exercise = list[index];
    setOutcomes((o) => [...o, { exercise, result }]);
    setRunning(null);
    setIndex((i) => i + 1);
    // A quick pain check between exercises, but not after the last one: the
    // end-of-session check-in covers that.
    if (result && result.reps > 0 && index + 1 < list.length) setAsking(true);
    window.scrollTo(0, 0);
  };

  if (index >= list.length) {
    const area = areaLowerLabel(active.shape.areaLabel);
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-3xl text-success">✓</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold">Session complete.</h1>
        <p className="mt-1 font-sans text-sm text-ink/60">That&apos;s today done. See you tomorrow.</p>

        <div className="mt-5 grid gap-2">
          {outcomes.map(({ exercise, result }) => {
            const scored = result?.sets.filter((s) => s.form !== null) ?? [];
            const form = scored.length ? Math.round(scored.reduce((a, s) => a + (s.form ?? 0), 0) / scored.length) : null;
            return (
              <Card key={exercise.slug} className="flex items-center justify-between p-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-sans text-sm font-bold">{exercise.name}</span>
                  <span className="font-sans text-xs text-ink/55">
                    {result === null || result.reps === 0
                      ? "Skipped"
                      : `${result.reps} ${exercise.coach?.mode === "reps" || exercise.manual.kind === "reps" ? "reps" : "sets"}`}
                  </span>
                </span>
                {form !== null && (
                  <span className="font-sans text-sm font-extrabold text-mint-deep">form {form}</span>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-4">
          {painLogged ? (
            <p className="text-center font-sans text-xs text-ink/55">Check-in saved.</p>
          ) : (
            <PainCheckIn area={area} onDone={() => setPainLogged(true)} />
          )}
        </div>

        <div className="flex-1" />
        <Link href="/today" className={`${btnPrimary} mt-6`}>
          Back to Today
        </Link>
        <Link href="/progress" className="mt-3 text-center font-sans text-xs font-bold text-ink/55">
          See your progress
        </Link>
        <LogoMark className="mx-auto mt-6 h-5 w-5 text-ink/30" />
      </div>
    );
  }

  if (asking) {
    const stop = shouldStop(midPain);
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className={eyebrow}>Quick check</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">How does it feel?</h1>
        <Card className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-sm font-bold">Pain right now</span>
            <span className="font-display text-3xl font-extrabold text-mint-deep">
              {midPain}
              <span className="text-sm text-ink/35">/10</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={midPain}
            onChange={(e) => setMidPain(Number(e.target.value))}
            className="mt-3 w-full accent-[#2FA67F]"
            aria-label="Pain level, 0 to 10"
          />
        </Card>
        {stop && (
          <Card className="mt-3 bg-white">
            <p className="font-sans text-sm font-extrabold">Stop for today</p>
            <p className="mt-1 font-sans text-xs leading-relaxed text-ink/70">
              Pain this high is a sign to rest. Take it easy and try again tomorrow. If it doesn&apos;t settle, speak to a clinician.
            </p>
          </Card>
        )}
        <div className="flex-1" />
        {stop ? (
          <>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                logPain(midPain);
                router.push("/today");
              }}
            >
              Stop and rest
            </button>
            <button
              type="button"
              className="mt-3 text-center font-sans text-xs font-bold text-ink/55"
              onClick={() => {
                logPain(midPain);
                setAsking(false);
              }}
            >
              Carry on anyway
            </button>
          </>
        ) : (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              logPain(midPain);
              setAsking(false);
            }}
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  const exercise = list[index];
  const label = `${index + 1} of ${list.length}`;

  if (running) {
    return (
      <ExerciseRunner
        key={exercise.slug + running}
        exercise={exercise}
        camera={running === "camera"}
        sessionLabel={label}
        onFinish={(r) => advance(r)}
        onExit={() => setRunning(null)}
      />
    );
  }

  return (
    <ExerciseIntro
      key={exercise.slug}
      exercise={exercise}
      back={{ onClick: () => router.push("/today"), label: "Exit session" }}
      header={
        <div className="mt-3">
          <div className="flex justify-between">
            <span className={eyebrow}>{active.shape.areaLabel} plan · exercise {label}</span>
            <button type="button" onClick={() => advance(null)} className="font-sans text-xs font-bold text-ink/45">
              Skip
            </button>
          </div>
          <ProgressBar pct={(index / list.length) * 100} className="mt-2" />
        </div>
      }
      onCamera={() => setRunning("camera")}
      onManual={() => setRunning("manual")}
    />
  );
}
