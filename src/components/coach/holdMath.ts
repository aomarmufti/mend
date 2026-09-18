import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LANDMARK, jointAngle, type Point, type Side } from "@/components/coach/poseMath";

/**
 * Generic pure logic for "get into position and hold" exercises (stretches),
 * as distinct from poseMath.ts's rep-based movement exercises. Two concerns,
 * both exercise-agnostic:
 *
 * 1. Deciding whether the tracked body is currently "in position" — exercise
 *    specific, see the signal functions below.
 * 2. Turning a stream of in-position/not booleans into a hold timer, a rep
 *    count, and a cue to show — trackHold(), shared by every hold exercise.
 */

export type HoldPhase = "seeking" | "holding" | "banked";

export interface HoldTracker {
  phase: HoldPhase;
  holdStartedAt: number | null;
  lastInPositionAt: number | null;
}

export const initialHoldTracker: HoldTracker = {
  phase: "seeking",
  holdStartedAt: null,
  lastInPositionAt: null,
};

export interface HoldConfig {
  /** Time in position needed to bank a rep. */
  minHoldMs: number;
  /** How long a momentary drop-out (sensor jitter, a shifted hand) is forgiven before the hold resets. */
  graceMs: number;
  /** How far out from minHoldMs the "nearly there" cue starts. */
  nearlyThereMs: number;
}

export const DEFAULT_HOLD_CONFIG: HoldConfig = {
  minHoldMs: 15_000,
  graceMs: 600,
  nearlyThereMs: 3_000,
};

export type HoldCue =
  | "seek" // not yet in position
  | "holding" // in position, timer running, not yet close to the target
  | "nearly" // in position, within nearlyThereMs of the target
  | "banked" // this hold has reached the target (fires once, then continues to report "banked" while still held)
  | "released-early"; // dropped out of position before reaching the target

export interface HoldResult {
  tracker: HoldTracker;
  /** Milliseconds held in the current attempt, 0 while seeking. */
  elapsedMs: number;
  /** True only on the exact frame a hold first crosses minHoldMs. */
  repBanked: boolean;
  cue: HoldCue;
}

/**
 * Advance the hold state machine by one frame. `inPosition` is computed by
 * the caller using whichever signal function fits the exercise (see below).
 *
 * A rep is one continuous hold that reaches `minHoldMs`. It banks the instant
 * that threshold is crossed — the user does not have to release first — so
 * holding longer than the target is free, never penalised. Dropping out
 * before the threshold resets the attempt without counting it, but only
 * after `graceMs` of being out of position, so a single noisy frame does not
 * throw away a real hold.
 */
export function trackHold(
  tracker: HoldTracker,
  inPosition: boolean,
  now: number,
  config: HoldConfig = DEFAULT_HOLD_CONFIG,
): HoldResult {
  if (inPosition) {
    if (tracker.phase === "seeking") {
      const started: HoldTracker = {
        phase: "holding",
        holdStartedAt: now,
        lastInPositionAt: now,
      };
      return { tracker: started, elapsedMs: 0, repBanked: false, cue: "holding" };
    }

    const elapsed = now - (tracker.holdStartedAt ?? now);
    const updated: HoldTracker = { ...tracker, lastInPositionAt: now };

    if (tracker.phase === "holding" && elapsed >= config.minHoldMs) {
      return {
        tracker: { ...updated, phase: "banked" },
        elapsedMs: elapsed,
        repBanked: true,
        cue: "banked",
      };
    }
    if (tracker.phase === "holding" && elapsed >= config.minHoldMs - config.nearlyThereMs) {
      return { tracker: updated, elapsedMs: elapsed, repBanked: false, cue: "nearly" };
    }
    return {
      tracker: updated,
      elapsedMs: elapsed,
      repBanked: false,
      cue: tracker.phase === "banked" ? "banked" : "holding",
    };
  }

  // Not in position this frame.
  if (tracker.phase === "seeking") {
    return { tracker, elapsedMs: 0, repBanked: false, cue: "seek" };
  }

  const lastSeen = tracker.lastInPositionAt ?? now;
  if (now - lastSeen < config.graceMs) {
    // Within the grace window — treat as still holding rather than reset on
    // a single dropped or misread frame.
    const elapsed = now - (tracker.holdStartedAt ?? now);
    return {
      tracker,
      elapsedMs: elapsed,
      repBanked: false,
      cue: tracker.phase === "banked" ? "banked" : "holding",
    };
  }

  // Grace expired — genuinely out of position. Reset for the next attempt.
  const gaveUpEarly = tracker.phase === "holding";
  return {
    tracker: initialHoldTracker,
    elapsedMs: 0,
    repBanked: false,
    cue: gaveUpEarly ? "released-early" : "seek",
  };
}

// ---------------------------------------------------------------------------
// Signal functions: exercise-specific ways of deciding "in position".
// ---------------------------------------------------------------------------

function visibilityOf(p: NormalizedLandmark): number {
  return typeof p.visibility === "number" ? p.visibility : 1;
}

/**
 * Vertical lift of a limb landmark (typically the ankle) relative to a
 * calibrated resting baseline, normalised by torso length so it does not
 * depend on distance from the camera. Positive = raised.
 *
 * Use this instead of a joint-angle check whenever the exercise brings the
 * hands close to the hip or knee (clasping behind the thigh, for instance):
 * verified against real footage, hip- and knee-angle readings become
 * unreliable under that occlusion — swinging by tens of degrees between
 * consecutive frames even at "confident" visibility scores — while the
 * ankle, untouched by the hands, stays comparatively stable. Torso length
 * and the landmark index are the same measurements poseMath.ts already
 * makes for the depth check, reused here rather than duplicated.
 */
export function normalizedLift(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
  baselineY: number,
  torsoLength: number,
): number | null {
  const ankle = landmarks[side === "left" ? LANDMARK.leftAnkle : LANDMARK.rightAnkle];
  if (!ankle || visibilityOf(ankle) < 0.5 || torsoLength <= 0) return null;
  return (baselineY - ankle.y) / torsoLength;
}

/** Which leg is more lifted right now, by normalised lift. Mirrors poseMath's activeLeg. */
export function moreLiftedSide(
  landmarks: NormalizedLandmark[],
  baselines: { left: number | null; right: number | null },
  torsoLength: number,
): { side: "left" | "right"; lift: number } | null {
  const candidates: { side: "left" | "right"; lift: number }[] = [];
  for (const side of ["left", "right"] as const) {
    const baseline = baselines[side];
    if (baseline === null) continue;
    const lift = normalizedLift(landmarks, side, baseline, torsoLength);
    if (lift !== null) candidates.push({ side, lift });
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.lift >= b.lift ? a : b));
}

// ---------------------------------------------------------------------------
// Signals: the per-exercise definition of "in position", evaluated per frame.
// ---------------------------------------------------------------------------

/** An open-ended range. Omit an end to leave it unbounded. */
export interface AngleBand {
  min?: number;
  max?: number;
}

export type HoldSignal =
  /**
   * One leg's knee and/or hip angle inside a band. Covers most floor and
   * standing stretches where the hands stay clear of the tracked joints:
   * a hamstring stretch wants the knee straight (knee min), a knee hug wants
   * the hip deeply flexed (hip max), a quad stretch wants both (knee max to
   * fold the heel in, hip min to keep the thigh pointing down).
   */
  | { kind: "jointBand"; knee?: AngleBand; hip?: AngleBand }
  /**
   * Normalised ankle lift against a calibrated baseline. For exercises where
   * the hands clasp near the hip or knee and wreck angle tracking there.
   */
  | { kind: "footLift"; minLift: number }
  /**
   * A standing split stance holding the back leg straight — a calf stretch.
   * Needs both legs at once: how far apart the feet are, and whether the
   * back (straighter) leg has stayed extended rather than collapsing.
   */
  | { kind: "splitStance"; backKneeMin: number; minSeparation: number };

export interface SignalReading {
  inPosition: boolean;
  /** Leg the overlay should highlight, when the signal tracks one. */
  side: Side | null;
  kneeAngle: number | null;
  hipAngle: number | null;
}

function visible(p: NormalizedLandmark | undefined): p is NormalizedLandmark {
  return !!p && (typeof p.visibility !== "number" || p.visibility >= 0.5);
}

function correct(p: NormalizedLandmark, aspect: number): Point {
  return { x: p.x * aspect, y: p.y };
}

function within(value: number, band?: AngleBand): boolean {
  if (!band) return true;
  if (band.min !== undefined && value < band.min) return false;
  if (band.max !== undefined && value > band.max) return false;
  return true;
}

interface LegAngles {
  side: Side;
  knee: number;
  hip: number;
  ankle: NormalizedLandmark;
}

/** Knee and hip angle for one leg, or null when its landmarks are not confidently seen. */
export function legAngles(
  landmarks: NormalizedLandmark[],
  side: Side,
  aspect: number,
): LegAngles | null {
  const i =
    side === "left"
      ? { sh: LANDMARK.leftShoulder, hip: LANDMARK.leftHip, knee: LANDMARK.leftKnee, ankle: LANDMARK.leftAnkle }
      : { sh: LANDMARK.rightShoulder, hip: LANDMARK.rightHip, knee: LANDMARK.rightKnee, ankle: LANDMARK.rightAnkle };

  const shoulder = landmarks[i.sh];
  const hip = landmarks[i.hip];
  const knee = landmarks[i.knee];
  const ankle = landmarks[i.ankle];
  if (!visible(shoulder) || !visible(hip) || !visible(knee) || !visible(ankle)) return null;

  return {
    side,
    knee: jointAngle(correct(hip, aspect), correct(knee, aspect), correct(ankle, aspect)),
    hip: jointAngle(correct(shoulder, aspect), correct(hip, aspect), correct(knee, aspect)),
    ankle,
  };
}

/**
 * Evaluate the configured signal against one frame. Returns null when the
 * body cannot be read confidently enough to judge, so the caller can hold
 * the previous state rather than treating "can't see" as "out of position".
 */
export function evaluateSignal(
  landmarks: NormalizedLandmark[],
  aspect: number,
  signal: HoldSignal,
  baselines: { left: number | null; right: number | null },
  torsoLength: number | null,
): SignalReading | null {
  const legs = [legAngles(landmarks, "left", aspect), legAngles(landmarks, "right", aspect)].filter(
    (l): l is LegAngles => l !== null,
  );

  if (signal.kind === "jointBand") {
    if (legs.length === 0) return null;
    const matching = legs.find((l) => within(l.knee, signal.knee) && within(l.hip, signal.hip));
    const chosen = matching ?? legs[0];
    return {
      inPosition: matching !== undefined,
      side: chosen.side,
      kneeAngle: chosen.knee,
      hipAngle: chosen.hip,
    };
  }

  if (signal.kind === "footLift") {
    if (torsoLength === null) return null;
    const lifted = moreLiftedSide(landmarks, baselines, torsoLength);
    if (!lifted) return null;
    const leg = legs.find((l) => l.side === lifted.side);
    return {
      inPosition: lifted.lift >= signal.minLift,
      side: lifted.side,
      kneeAngle: leg?.knee ?? null,
      hipAngle: leg?.hip ?? null,
    };
  }

  // splitStance. The stance width only needs the two ankles; the knee check
  // only needs the back leg's own chain. Requiring a full confident chain on
  // *both* legs is too strict: measured in a side-on standing clip, the far
  // knee flickers between 0.47 and 0.55 visibility — across the threshold —
  // while shoulders, hips and the near leg all sit at 0.93–1.00. Demanding
  // both dropped the reading for a second at a time and reset live holds.
  const leftAnkle = landmarks[LANDMARK.leftAnkle];
  const rightAnkle = landmarks[LANDMARK.rightAnkle];
  if (!visible(leftAnkle) || !visible(rightAnkle) || legs.length === 0) return null;

  const separation = Math.abs(leftAnkle.x - rightAnkle.x) * aspect;
  // The back leg is the straighter one. If only the front leg is readable its
  // knee is bent, so this reads as out of position — a false negative rather
  // than a false pass, which is the safe way round to be wrong.
  const back = legs.reduce((a, b) => (a.knee >= b.knee ? a : b));
  return {
    inPosition: separation >= signal.minSeparation && back.knee >= signal.backKneeMin,
    side: back.side,
    kneeAngle: back.knee,
    hipAngle: back.hip,
  };
}

// ---------------------------------------------------------------------------
// Readability: telling "out of position" apart from "can't see right now".
// ---------------------------------------------------------------------------

/**
 * How long an unreadable body is treated as still holding whatever it was
 * last doing. Long enough to ride out a landmark flickering across its
 * confidence threshold; short enough that walking out of frame mid-hold
 * cannot bank a rep the user never earned.
 */
export const UNREADABLE_GRACE_MS = 1_000;

export interface ReadabilityTracker {
  lastInPosition: boolean;
  unreadableSince: number | null;
}

export const initialReadability: ReadabilityTracker = {
  lastInPosition: false,
  unreadableSince: null,
};

/**
 * Turn a possibly-null signal reading into the boolean trackHold needs.
 *
 * A null reading means the body could not be read confidently — which is not
 * the same as being out of position, and must not be passed on as `false`.
 * Doing that resets a legitimate hold every time a landmark dips below its
 * confidence threshold. Instead the last known state carries for a short
 * grace period, then falls back to out-of-position so an unreadable camera
 * can never quietly complete a rep.
 */
export function resolveInPosition(
  tracker: ReadabilityTracker,
  reading: SignalReading | null,
  now: number,
): { tracker: ReadabilityTracker; inPosition: boolean; unreadable: boolean } {
  if (reading) {
    return {
      tracker: { lastInPosition: reading.inPosition, unreadableSince: null },
      inPosition: reading.inPosition,
      unreadable: false,
    };
  }

  const since = tracker.unreadableSince ?? now;
  const withinGrace = now - since < UNREADABLE_GRACE_MS;
  return {
    tracker: { ...tracker, unreadableSince: since },
    inPosition: withinGrace ? tracker.lastInPosition : false,
    unreadable: true,
  };
}
