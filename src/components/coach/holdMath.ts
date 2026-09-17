import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LANDMARK } from "@/components/coach/poseMath";

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
