"use client";

import dynamic from "next/dynamic";
import type { CatalogExercise } from "@/data/catalog";
import { ManualCoach } from "@/components/coach/ManualCoach";
import type { CoachResult } from "@/components/coach/HoldCoach";

// Touches navigator.mediaDevices, so it can only run in the browser.
const HoldCoach = dynamic(() => import("@/components/coach/HoldCoach").then((m) => m.HoldCoach), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 bg-night" />,
});

/** One exercise, done with the camera coach or without it. */
export function ExerciseRunner({
  exercise,
  camera,
  onFinish,
  onExit,
  exitHref,
  sessionLabel,
}: {
  exercise: CatalogExercise;
  camera: boolean;
  onFinish?: (r: CoachResult) => void;
  onExit?: () => void;
  exitHref?: string;
  sessionLabel?: string;
}) {
  if (camera && exercise.coach) {
    return (
      <HoldCoach
        config={exercise.coach}
        reference={exercise.reference}
        framing={exercise.framing}
        posture={exercise.posture}
        cues={exercise.cues}
        onFinish={onFinish}
        onExit={onExit}
        exitHref={exitHref}
        sessionLabel={sessionLabel}
      />
    );
  }
  return <ManualCoach exercise={exercise} onFinish={onFinish} onExit={onExit} exitHref={exitHref} />;
}
