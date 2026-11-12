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

  const advance = (result: CoachResult | null) => {
    const exercise = list[index];
    setOutcomes((o) => [...o, { exercise, result }]);
    setRunning(null);
    setIndex((i) => i + 1);
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
