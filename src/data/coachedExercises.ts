import type { HoldExerciseConfig } from "@/components/coach/HoldCoach";

/**
 * Camera-coach configurations for the NHS Lanarkshire PFPS exercises.
 *
 * These are kept apart from `exercises.ts` (the protocol transcription) and
 * from `mobilityExercises.ts` (the filmed stretches) because their thresholds
 * have a third, weaker provenance, and conflating the three would hide that.
 *
 *   `filmed`   — measured off reference footage, frame by frame. The six
 *                stretches in mobilityExercises.ts.
 *   `protocol` — derived from an angle the NHS Lanarkshire guidance states in
 *                words. "Squat down to roughly 45–60°" is a real number from a
 *                real clinical source, so turning it into a knee angle is
 *                arithmetic rather than invention. But nobody has yet checked
 *                that MediaPipe, on this camera, at this framing, reports that
 *                angle for that movement.
 *
 * Everything here is `protocol`, and the UI says so. A protocol threshold is
 * good enough to coach with and not good enough to claim accuracy for: it is
 * the difference between "this is the angle the exercise asks for" and "this
 * is the angle the camera reads when you do it". Closing that gap needs
 * footage of each movement, replayed through `scripts/calibrate.mjs`.
 *
 * Exercises absent from this file are absent deliberately — see
 * NEEDS_FOOTAGE below.
 */

export type Calibration = "filmed" | "protocol";

export interface CoachedExercise {
  config: HoldExerciseConfig;
  calibration: Calibration;
  /** Where the numbers came from, in a sentence the UI can show. */
  provenance: string;
}

const PROTOCOL =
  "Thresholds derived from the angles NHS Lanarkshire's guidance states in words, not yet measured against footage of the movement.";

export const coachedExercises: Record<string, CoachedExercise> = {
  "mini-squat": {
    calibration: "protocol",
    provenance: PROTOCOL,
    config: {
      slug: "mini-squat",
      name: "Mini Squat",
      mode: "reps",
      // The guidance says "roughly 45–60°" of knee bend. Interior knee angle
      // is 180 minus that, so the shallow end — 45° of bend — is 135°. Passing
      // 135° means the user has entered the prescribed range; going deeper is
      // a different exercise (the full squat), not a failed rep, so there is
      // no lower bound here.
      signal: { kind: "jointBand", knee: { max: 135 } },
      targetReps: 10,
      setupHint:
        "Stand side-on to the camera, a chair within reach, with your whole body in frame.",
    },
  },

  "full-squat": {
    calibration: "protocol",
    provenance: PROTOCOL,
    config: {
      slug: "full-squat",
      name: "Full Squat",
      mode: "reps",
      // "Thighs parallel to the floor" is 90° of knee bend. 100° allows ten
      // degrees for the difference between a thigh being parallel and a
      // landmark-derived angle saying so.
      signal: { kind: "jointBand", knee: { max: 100 } },
      targetReps: 10,
      setupHint:
        "Stand side-on to the camera with your whole body and both feet in frame.",
    },
  },

  "single-leg-stand": {
    calibration: "protocol",
    provenance:
      "Hold length is the 10s the guidance prescribes. The position check is geometric — one ankle clearly above the other — rather than a tuned threshold.",
    config: {
      slug: "single-leg-stand",
      name: "Single Leg Stand",
      mode: "hold",
      // Categorical rather than finely tuned: either a foot is off the floor
      // or it is not. A tenth of a torso length is far more than standing
      // noise and far less than a deliberate lift, so this is the one
      // threshold here that does not really need footage to defend.
      signal: { kind: "singleLegStance", minAnkleGap: 0.1 },
      targetReps: 3,
      hold: { minHoldMs: 10_000 },
      setupHint:
        "Stand facing the camera, a chair within reach, with your whole body in frame.",
    },
  },

  "forward-lunge": {
    calibration: "protocol",
    provenance:
      "Front-knee bend from the guidance's description. Stance separation is carried over from the filmed calf stretch, the same stepped-stance geometry, and is the one number here with no lunge footage behind it.",
    config: {
      slug: "forward-lunge",
      name: "Forward Lunge",
      mode: "reps",
      // Both knees bend in a lunge, so there is no "straight back leg" to
      // require — backKneeMin is left at zero and the rep is defined by the
      // front knee bending inside a stepped stance.
      //
      // minSeparation is in torso lengths. It read 0.13 when the signal
      // measured the frame rather than the body, which at the calf clip's
      // framing (torso 0.175) is 0.70 torso lengths — so the value changes
      // but the stance it asks for does not. Unverified either way until
      // there is lunge footage: no clip of this movement has been measured.
      signal: {
        kind: "splitStance",
        backKneeMin: 0,
        minSeparation: 0.7,
        frontKneeMax: 120,
      },
      targetReps: 10,
      setupHint:
        "Stand side-on to the camera with room to step forward, whole body in frame.",
    },
  },
};

/**
 * Exercises with no camera coaching, and why. Shown to the user rather than
 * left as a silent gap, and kept here so the reason travels with the decision.
 */
export const NEEDS_FOOTAGE: Record<string, string> = {
  "single-leg-squat":
    "Needs both a one-legged stance and a controlled knee bend read at the same time, and the guidance sets no depth target to derive one from. Reference footage would settle it.",
  "hip-abduction":
    "Filmed side-lying but tracked front-on, and the lifting leg travels along the camera's depth axis from most angles. Needs footage shot at the intended framing before a threshold means anything.",
};

export function getCoachedExercise(slug: string): CoachedExercise | undefined {
  return coachedExercises[slug];
}

/** Whether a protocol exercise has a live camera check today. */
export function hasCameraCheck(slug: string): boolean {
  return slug in coachedExercises || slug === "heel-slides";
}
