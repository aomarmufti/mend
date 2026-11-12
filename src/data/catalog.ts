/**
 * Every exercise the app can put in front of someone, in one shape.
 *
 * The sources stay separate — `exercises.ts` is the NHS Lanarkshire PFPS
 * transcription, `mobilityExercises.ts` the filmed stretches, and
 * `coachedExercises.ts` the protocol-derived camera checks — because their
 * provenance differs and merging them would hide that. This file only joins
 * them for the screens, so Plan, the exercise page, the coach and the session
 * runner all read one type instead of each re-deriving the same answers
 * ("is there a camera check?", "how is the camera set up?").
 */

import type { HoldExerciseConfig } from "@/components/coach/HoldCoach";
import type { ReferenceClip } from "@/components/coach/ReferenceLoop";
import { exercises, stageOrder, type Exercise, type Stage } from "@/data/exercises";
import { coachedExercises, NEEDS_FOOTAGE, type Calibration } from "@/data/coachedExercises";
import { mobilityExercises, getMobilityForCondition, type MobilityExercise } from "@/data/mobilityExercises";
import { getArea, getCondition, type Condition } from "@/data/conditions";

/** How the user does this exercise in the app. */
export type ExerciseMode = "camera" | "timer" | "cues";

export type Framing = "side" | "front";
export type Posture = "standing" | "lying";

/** The dose the timer / counter works to when the camera is not in use. */
export type ManualDose =
  | { kind: "hold"; holdSec: number; sets: number }
  | { kind: "reps"; reps: number; holdSec?: number };

export interface CatalogExercise {
  slug: string;
  name: string;
  /** Present for programme exercises. */
  stage: Stage | null;
  source: "pfps" | "filmed";
  dosage: string;
  /** "Hold 15 seconds, 3 times" — the dose as a sentence. */
  doseLine: string;
  steps: string[];
  cues: string[];
  mode: ExerciseMode;
  coach: HoldExerciseConfig | null;
  calibration: Calibration | null;
  provenance: string | null;
  reference: ReferenceClip | null;
  framing: Framing;
  posture: Posture;
  /** Camera setup, in one sentence. */
  setup: string;
  manual: ManualDose;
  /** Why there is no camera check, where there is none. */
  noCameraReason: string | null;
}

/** Split a paragraph of instructions into numbered steps. */
function toSteps(text: string): string[] {
  return text
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function postureOf(setupHint: string): Posture {
  return /lie|lying/i.test(setupHint) ? "lying" : "standing";
}

function framingOf(setupHint: string): Framing {
  return /facing the camera|front-on/i.test(setupHint) ? "front" : "side";
}

/** The heel slide is the original camera check; it has no entry in coachedExercises. */
const HEEL_SLIDES: HoldExerciseConfig = {
  slug: "heel-slides",
  name: "Heel Slides",
  mode: "reps",
  signal: { kind: "heelSlide" },
  targetReps: 10,
  setupHint: "Lie on your back, side-on to the camera, with your whole body in frame.",
};

/**
 * Manual doses for the programme exercises, taken from the bottom of each
 * prescribed range in `exercises.ts`. Starting at the low end of a range the
 * guidance gives is a reading of the guidance; picking somewhere inside it
 * for a person we have not assessed would not be.
 */
const PFPS_MANUAL: Record<string, ManualDose> = {
  "isometric-knee-extension": { kind: "reps", reps: 5, holdSec: 5 },
  "hip-abduction": { kind: "reps", reps: 5, holdSec: 5 },
  "heel-slides": { kind: "reps", reps: 5 },
  "mini-squat": { kind: "reps", reps: 5 },
  "full-squat": { kind: "reps", reps: 5 },
  "single-leg-stand": { kind: "hold", holdSec: 10, sets: 3 },
  "single-leg-squat": { kind: "reps", reps: 5 },
  "forward-lunge": { kind: "reps", reps: 5 },
};

function doseLine(manual: ManualDose, coach: HoldExerciseConfig | null): string {
  if (coach && coach.mode !== "reps") {
    const sec = Math.round((coach.hold?.minHoldMs ?? 15_000) / 1000);
    return `Hold ${sec} seconds, ${coach.targetReps} times`;
  }
  if (coach) return `${coach.targetReps} reps`;
  if (manual.kind === "hold") return `Hold ${manual.holdSec} seconds, ${manual.sets} times`;
  return manual.holdSec
    ? `${manual.reps} reps, hold each ${manual.holdSec} seconds`
    : `${manual.reps} reps`;
}

function fromProgramme(e: Exercise): CatalogExercise {
  const coached = coachedExercises[e.slug];
  const coach = e.slug === "heel-slides" ? HEEL_SLIDES : (coached?.config ?? null);
  const setupHint =
    coach?.setupHint ??
    (e.slug === "hip-abduction"
      ? "Lie on your side facing the camera, whole body in frame."
      : "Lie on your back, side-on to the camera.");
  const manual = PFPS_MANUAL[e.slug] ?? { kind: "reps", reps: 5 };
  return {
    slug: e.slug,
    name: e.name,
    stage: e.stage,
    source: "pfps",
    dosage: e.dosage,
    doseLine: doseLine(manual, coach),
    steps: toSteps(e.position),
    cues: e.cues,
    mode: coach ? "camera" : e.cameraCoach ? "cues" : "timer",
    coach,
    calibration: coached?.calibration ?? (e.slug === "heel-slides" ? "protocol" : null),
    provenance:
      coached?.provenance ??
      (e.slug === "heel-slides"
        ? "Depth and pelvis thresholds tuned by eye for the original demo, not measured against footage."
        : null),
    reference: null,
    framing: framingOf(setupHint),
    posture: postureOf(setupHint),
    setup: setupHint,
    manual,
    noCameraReason: coach
      ? null
      : (NEEDS_FOOTAGE[e.slug] ??
        "This is an isometric hold, so there is no visible movement for the camera to track. Use the hold timer instead."),
  };
}

function fromMobility(m: MobilityExercise): CatalogExercise {
  const holdSec = Math.round((m.hold?.hold?.minHoldMs ?? 15_000) / 1000);
  const manual: ManualDose = { kind: "hold", holdSec, sets: m.hold?.targetReps ?? 3 };
  const setupHint = m.hold?.setupHint ?? "Whole body in frame.";
  return {
    slug: m.slug,
    name: m.name,
    stage: null,
    source: "filmed",
    dosage: m.dosage,
    doseLine: doseLine(manual, m.hold),
    steps: toSteps(m.position),
    cues: m.cues,
    mode: m.hold ? "camera" : "timer",
    coach: m.hold,
    calibration: m.hold ? "filmed" : null,
    provenance: m.provenance,
    reference: m.reference ?? null,
    framing: framingOf(setupHint),
    posture: postureOf(setupHint),
    setup: setupHint,
    manual,
    noCameraReason: m.hold ? null : (m.cameraNote ?? null),
  };
}

export const catalog: CatalogExercise[] = [
  ...exercises.map(fromProgramme),
  ...mobilityExercises.map(fromMobility),
];

export function getCatalogExercise(slug: string | undefined): CatalogExercise | undefined {
  return catalog.find((e) => e.slug === slug);
}

export const MODE_LABEL: Record<ExerciseMode, string> = {
  camera: "Camera coach",
  timer: "Hold timer",
  cues: "Cues only",
};

// ---- plans -----------------------------------------------------------------

export interface PlanShape {
  condition: Condition;
  /** Area label, for "Knee plan" and "How is your knee today?". */
  areaLabel: string;
  staged: boolean;
  /** Programme exercises by stage. Empty for stretch-only plans. */
  stages: { stage: Stage; exercises: CatalogExercise[] }[];
  /** Filmed stretches offered under this condition. */
  stretches: CatalogExercise[];
}

export function planFor(conditionSlug: string): PlanShape | null {
  const condition = getCondition(conditionSlug);
  if (!condition) return null;
  const area = getArea(condition.areaSlug);
  const stretches = getMobilityForCondition(condition.slug)
    .map((m) => getCatalogExercise(m.slug)!)
    .filter(Boolean);
  const staged = condition.programme === "pfps";
  return {
    condition,
    areaLabel: area?.label ?? condition.name,
    staged,
    stages: staged
      ? stageOrder.map((stage) => ({
          stage,
          exercises: catalog.filter((e) => e.source === "pfps" && e.stage === stage),
        }))
      : [],
    stretches,
  };
}

/** Whether a condition has anything to do at all. */
export function conditionIsReady(c: Condition): boolean {
  return c.programme !== null || getMobilityForCondition(c.slug).length > 0;
}

/** Today's session: the current stage for a programme, the stretches otherwise. */
export function sessionFor(plan: PlanShape, stage: Stage): CatalogExercise[] {
  if (plan.staged) return plan.stages.find((s) => s.stage === stage)?.exercises ?? [];
  return plan.stretches;
}

/** Rough minutes, for "about 9 minutes". Three a piece covers setup and rest. */
export function sessionMinutes(list: CatalogExercise[]): number {
  return Math.max(3, list.length * 3);
}

export function areaLowerLabel(label: string): string {
  return label.split(/\s+(?:&|and)\s+/)[0].toLowerCase();
}
