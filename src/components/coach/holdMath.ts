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
  /**
   * Shortest hold that still counts as a set, when the user comes out before
   * reaching the target.
   *
   * Someone who holds a calf stretch for nine seconds and switches legs has
   * done the exercise — less of it than asked, but not nothing, and refusing
   * to count it teaches them the app is not paying attention. So it banks,
   * and the record carries the real duration and a partial flag, because a
   * short set counting is a product decision and a short set being recorded
   * as a full one would be a lie.
   *
   * Below this, it is a drop-out rather than a set.
   */
  minPartialMs: number;
}

export const DEFAULT_HOLD_CONFIG: HoldConfig = {
  minHoldMs: 15_000,
  graceMs: 600,
  nearlyThereMs: 3_000,
  // A third of the target. Long enough that a stumble or a readjustment is
  // not a set; short enough that genuine effort is not thrown away.
  minPartialMs: 5_000,
};

export type HoldCue =
  | "seek" // not yet in position
  | "holding" // in position, timer running, not yet close to the target
  | "nearly" // in position, within nearlyThereMs of the target
  | "banked" // this hold has reached the target (fires once, then continues to report "banked" while still held)
  | "banked-partial" // came out early, but held long enough to count as a short set
  | "released-early"; // dropped out before holding long enough to count at all

export interface HoldResult {
  tracker: HoldTracker;
  /** Milliseconds held in the current attempt, 0 while seeking. */
  elapsedMs: number;
  /** True on the exact frame a set is banked, full or partial. */
  repBanked: boolean;
  /** True when the banked set was short of the target. */
  partial: boolean;
  /** Duration actually held, on the frame a set banks. Zero otherwise. */
  bankedMs: number;
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
      return { tracker: started, elapsedMs: 0, repBanked: false, partial: false, bankedMs: 0, cue: "holding" };
    }

    const elapsed = now - (tracker.holdStartedAt ?? now);
    const updated: HoldTracker = { ...tracker, lastInPositionAt: now };

    if (tracker.phase === "holding" && elapsed >= config.minHoldMs) {
      return {
        tracker: { ...updated, phase: "banked" },
        elapsedMs: elapsed,
        repBanked: true,
        partial: false,
        bankedMs: elapsed,
        cue: "banked",
      };
    }
    if (tracker.phase === "holding" && elapsed >= config.minHoldMs - config.nearlyThereMs) {
      return { tracker: updated, elapsedMs: elapsed, repBanked: false, partial: false, bankedMs: 0, cue: "nearly" };
    }
    return {
      tracker: updated,
      elapsedMs: elapsed,
      repBanked: false,
      partial: false,
      bankedMs: 0,
      cue: tracker.phase === "banked" ? "banked" : "holding",
    };
  }

  // Not in position this frame.
  if (tracker.phase === "seeking") {
    return { tracker, elapsedMs: 0, repBanked: false, partial: false, bankedMs: 0, cue: "seek" };
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
      partial: false,
      bankedMs: 0,
      cue: tracker.phase === "banked" ? "banked" : "holding",
    };
  }

  // Grace expired — genuinely out of position.
  const gaveUpEarly = tracker.phase === "holding";
  // Measure to the last frame actually in position, not to now: the grace
  // window is forgiveness for a dropped reading, not extra credit.
  const heldFor = Math.max(0, lastSeen - (tracker.holdStartedAt ?? lastSeen));

  if (gaveUpEarly && heldFor >= config.minPartialMs) {
    return {
      tracker: initialHoldTracker,
      elapsedMs: 0,
      repBanked: true,
      partial: true,
      bankedMs: heldFor,
      cue: "banked-partial",
    };
  }

  return {
    tracker: initialHoldTracker,
    elapsedMs: 0,
    repBanked: false,
    partial: false,
    bankedMs: 0,
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
  | {
      kind: "splitStance";
      backKneeMin: number;
      /**
       * How far apart the feet must be, as a fraction of torso length.
       *
       * Body-relative, not frame-relative: a stance measured as a fraction of
       * the frame shrinks as the user steps back from the camera, so a
       * frame-relative threshold silently encodes the distance it was filmed
       * at and rejects the same correct stretch performed further away.
       */
      minSeparation: number;
      /** Lunges also need the FRONT knee bent, not just the back leg straight. */
      frontKneeMax?: number;
    }
  /**
   * Standing on one leg: the lifted ankle sits clearly higher than the
   * planted one. Measured as a fraction of torso length so it does not
   * depend on distance from the camera. Unlike `footLift` this needs no
   * calibrated baseline — it compares the two ankles to each other, which
   * is what "one foot off the floor" actually means.
   */
  | { kind: "singleLegStance"; minAnkleGap: number }
  /**
   * Angle between the two legs at the hips — a hip abduction. Needs the
   * front-on framing the exercise is filmed in; side-on, the lifting leg
   * travels along the camera's depth axis and this reads near zero.
   */
  | { kind: "legSeparation"; minAngle: number }
  /**
   * Knees rolled to one side while lying on your back — a lumbar rotation.
   *
   * The obvious measurement, how far apart the knees are sideways, does not
   * work from a side-on camera: the roll happens along the camera's depth
   * axis, so both knees project onto nearly the same point (measured
   * separation stayed at 0.000–0.004 across a whole clip). What a side-on
   * camera *can* see is that the knees drop toward the floor as they roll.
   * `maxKneeHeight` is that drop: the knee midpoint's height above the hips,
   * as a fraction of torso length, negative because the screen's y axis
   * points down. Lying with knees up measures about -0.60; rolled to either
   * side it rises to between -0.48 and -0.39, so a ceiling around -0.52
   * separates the two with margin at both ends.
   */
  | { kind: "kneeRoll"; maxKneeHeight: number };

/**
 * How far outside a target a reading can drift before quality reads zero.
 * Angles in degrees; ratios in torso lengths, matching the units each signal
 * measures in.
 */
const ANGLE_TOLERANCE = 30;
const RATIO_TOLERANCE = 0.14;

function clamp01to100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/**
 * Grade a value against a band, 0-100. Inside the band is 100; outside it
 * falls off linearly over `tolerance` and floors at zero.
 *
 * Graded rather than pass/fail for the same reason poseMath scores the heel
 * slide continuously: a boolean gives the user a number stuck on one of two
 * values, which tells them nothing about whether the correction they just
 * made helped. A continuous score moves as they adjust.
 */
function bandScore(value: number, band: AngleBand | undefined, tolerance: number): number {
  if (!band) return 100;
  let miss = 0;
  if (band.min !== undefined && value < band.min) miss = band.min - value;
  if (band.max !== undefined && value > band.max) miss = value - band.max;
  return clamp01to100(100 - (miss / tolerance) * 100);
}

/**
 * Grade a one-sided "at least this much" target.
 *
 * Meeting the floor exactly scores 70, not 100: the user is in position, but
 * only just, and a score that saturates the moment the threshold is crossed
 * tells them nothing about whether there is room to improve. 100 is reserved
 * for being comfortably past it — a full tolerance clear — so the number keeps
 * moving while they deepen the stretch, which is the whole point of showing
 * it live.
 */
const AT_FLOOR_SCORE = 70;

function atLeastScore(value: number, floor: number, tolerance: number): number {
  if (value >= floor) {
    const over = Math.min(1, (value - floor) / tolerance);
    return clamp01to100(AT_FLOOR_SCORE + (100 - AT_FLOOR_SCORE) * over);
  }
  const under = Math.min(1, (floor - value) / tolerance);
  return clamp01to100(AT_FLOOR_SCORE * (1 - under));
}

export interface SignalReading {
  inPosition: boolean;
  /**
   * 0-100 on how well this frame matches the target position. 100 means
   * comfortably inside it. Informational only — `inPosition` alone decides
   * whether a hold or a rep counts, so the score can be shown and logged
   * without changing what gets banked.
   */
  quality: number;
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
    // Weakest link, not the average: if the hip is right and the knee is
    // wrong, the position is wrong, and the number should say so.
    const quality = Math.min(
      bandScore(chosen.knee, signal.knee, ANGLE_TOLERANCE),
      bandScore(chosen.hip, signal.hip, ANGLE_TOLERANCE),
    );
    return {
      inPosition: matching !== undefined,
      quality,
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
      quality: atLeastScore(lifted.lift, signal.minLift, RATIO_TOLERANCE),
      side: lifted.side,
      kneeAngle: leg?.knee ?? null,
      hipAngle: leg?.hip ?? null,
    };
  }

  if (signal.kind === "kneeRoll") {
    if (torsoLength === null) return null;
    const leftKnee = landmarks[LANDMARK.leftKnee];
    const rightKnee = landmarks[LANDMARK.rightKnee];
    const leftHip = landmarks[LANDMARK.leftHip];
    const rightHip = landmarks[LANDMARK.rightHip];
    // Only the near-side landmarks are ever confident here — rolling puts one
    // knee behind the other — so this needs one readable knee and one readable
    // hip, not a matched pair. Midpoints fall back to whichever side is seen.
    const knee = visible(leftKnee) ? leftKnee : visible(rightKnee) ? rightKnee : null;
    const hip = visible(leftHip) ? leftHip : visible(rightHip) ? rightHip : null;
    if (!knee || !hip) return null;

    const bothKnees = visible(leftKnee) && visible(rightKnee);
    const kneeY = bothKnees ? (leftKnee.y + rightKnee.y) / 2 : knee.y;
    const bothHips = visible(leftHip) && visible(rightHip);
    const hipY = bothHips ? (leftHip.y + rightHip.y) / 2 : hip.y;

    const height = (kneeY - hipY) / torsoLength;
    const leg = legs[0] ?? null;
    return {
      inPosition: height >= signal.maxKneeHeight,
      quality: atLeastScore(height, signal.maxKneeHeight, RATIO_TOLERANCE),
      side: leg?.side ?? null,
      kneeAngle: leg?.knee ?? null,
      hipAngle: leg?.hip ?? null,
    };
  }

  if (signal.kind === "singleLegStance") {
    if (torsoLength === null) return null;
    const left = landmarks[LANDMARK.leftAnkle];
    const right = landmarks[LANDMARK.rightAnkle];
    if (!visible(left) || !visible(right)) return null;
    // Positive when the left ankle is the higher one, negative when it is the
    // right. The sign tells us which leg is lifted; the magnitude is the lift.
    const gap = (right.y - left.y) / torsoLength;
    const liftedSide: Side = gap >= 0 ? "left" : "right";
    // The STANDING leg is the one being coached — it is the one doing the work
    // and the one whose alignment matters — so the overlay follows it.
    const standingSide: Side = liftedSide === "left" ? "right" : "left";
    const standing = legs.find((l) => l.side === standingSide);
    return {
      inPosition: Math.abs(gap) >= signal.minAnkleGap,
      quality: atLeastScore(Math.abs(gap), signal.minAnkleGap, RATIO_TOLERANCE),
      side: standingSide,
      kneeAngle: standing?.knee ?? null,
      hipAngle: standing?.hip ?? null,
    };
  }

  if (signal.kind === "legSeparation") {
    const hip = visible(landmarks[LANDMARK.leftHip])
      ? landmarks[LANDMARK.leftHip]
      : visible(landmarks[LANDMARK.rightHip])
        ? landmarks[LANDMARK.rightHip]
        : null;
    const leftAnkle = landmarks[LANDMARK.leftAnkle];
    const rightAnkle = landmarks[LANDMARK.rightAnkle];
    if (!hip || !visible(leftAnkle) || !visible(rightAnkle)) return null;
    // Angle subtended at the hip by the two ankles: legs together reads near
    // 0 degrees, a lifted top leg opens it up.
    const separation = jointAngle(
      correct(leftAnkle, aspect),
      correct(hip, aspect),
      correct(rightAnkle, aspect),
    );
    const top = legs.length
      ? legs.reduce((a, b) => (a.ankle.y <= b.ankle.y ? a : b))
      : null;
    return {
      inPosition: separation >= signal.minAngle,
      quality: atLeastScore(separation, signal.minAngle, ANGLE_TOLERANCE),
      side: top?.side ?? null,
      kneeAngle: top?.knee ?? null,
      hipAngle: top?.hip ?? null,
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
  if (torsoLength === null) return null;

  // Divided by torso length, like every other ratio signal here. Measured in
  // the frame alone this was the one threshold that moved with the user's
  // distance from the camera: a held calf stretch filmed head-to-toe reads
  // 0.12-0.16 of the frame, but the same stretch two steps further back reads
  // under 0.10 and was rejected outright. That is the "sometimes works"
  // failure — the stretch was right and the yardstick was wrong.
  const separation = (Math.abs(leftAnkle.x - rightAnkle.x) * aspect) / torsoLength;
  // The back leg is the straighter one. If only the front leg is readable its
  // knee is bent, so this reads as out of position — a false negative rather
  // than a false pass, which is the safe way round to be wrong.
  const back = legs.reduce((a, b) => (a.knee >= b.knee ? a : b));
  const front = legs.reduce((a, b) => (a.knee <= b.knee ? a : b));
  // A lunge additionally needs the front knee bent. Without both legs
  // readable we cannot tell a lunge from a split stance, so this fails
  // closed rather than counting a rep nobody performed.
  const frontOk =
    signal.frontKneeMax === undefined ||
    (legs.length >= 2 && front.knee <= signal.frontKneeMax);
  const stanceQuality = Math.min(
    atLeastScore(separation, signal.minSeparation, RATIO_TOLERANCE),
    atLeastScore(back.knee, signal.backKneeMin, ANGLE_TOLERANCE),
    signal.frontKneeMax === undefined || legs.length < 2
      ? 100
      : bandScore(front.knee, { max: signal.frontKneeMax }, ANGLE_TOLERANCE),
  );
  return {
    inPosition:
      separation >= signal.minSeparation &&
      back.knee >= signal.backKneeMin &&
      frontOk,
    quality: stanceQuality,
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

// ---------------------------------------------------------------------------
// Rep tracking: the same in-position signal, counted as repetitions instead
// of as a sustained hold.
// ---------------------------------------------------------------------------

/**
 * A hold and a rep are the same measurement read two different ways. A stretch
 * asks you to reach a position and stay there; a squat asks you to reach it
 * and come back. So rep tracking consumes exactly the boolean `trackHold`
 * does, and differs only in when it banks.
 *
 * A rep banks on the way *out* of the target zone, not on the way in: a squat
 * is not finished at the bottom, it is finished when you have stood back up.
 * Banking on entry would also count a single slow descent as a rep while the
 * user is still mid-movement.
 */
export interface RepConfig {
  /** Time that must be spent in the zone before leaving it can count. */
  minInZoneMs: number;
  /** Floor on the interval between banked reps. */
  minRepMs: number;
  /** Momentary drop-out forgiven before the zone is considered left. */
  graceMs: number;
}

export const DEFAULT_REP_CONFIG: RepConfig = {
  // Deep enough to exclude a bounce, short enough not to demand a pause at
  // the bottom of a squat, which is not what the exercise asks for.
  minInZoneMs: 350,
  minRepMs: 800,
  graceMs: 250,
};

export type RepPhase = "ready" | "inZone" | "leaving";

export interface RepTrackerState {
  phase: RepPhase;
  enteredZoneAt: number | null;
  lastInZoneAt: number | null;
  lastRepAt: number;
}

export const initialRepTrackerState: RepTrackerState = {
  phase: "ready",
  enteredZoneAt: null,
  lastInZoneAt: null,
  lastRepAt: 0,
};

export type RepCue =
  | "ready" // out of the zone, waiting for the next rep
  | "descending" // in the zone but not yet long enough for it to count
  | "holding" // in the zone and it will count once they come back out
  | "counted" // fires on the frame a rep banks
  | "tooFast"; // left the zone before it could count

export interface RepResult {
  tracker: RepTrackerState;
  repBanked: boolean;
  cue: RepCue;
  /** Milliseconds spent in the zone on this attempt, 0 when outside it. */
  inZoneMs: number;
}

export function trackReps(
  tracker: RepTrackerState,
  inPosition: boolean,
  now: number,
  config: RepConfig = DEFAULT_REP_CONFIG,
): RepResult {
  if (inPosition) {
    if (tracker.phase === "ready") {
      return {
        tracker: {
          ...tracker,
          phase: "inZone",
          enteredZoneAt: now,
          lastInZoneAt: now,
        },
        repBanked: false,
        cue: "descending",
        inZoneMs: 0,
      };
    }
    const inZoneMs = now - (tracker.enteredZoneAt ?? now);
    return {
      tracker: { ...tracker, phase: "inZone", lastInZoneAt: now },
      repBanked: false,
      cue: inZoneMs >= config.minInZoneMs ? "holding" : "descending",
      inZoneMs,
    };
  }

  if (tracker.phase === "ready") {
    return { tracker, repBanked: false, cue: "ready", inZoneMs: 0 };
  }

  // Out of the zone, but a single misread frame is not a completed rep.
  const since = now - (tracker.lastInZoneAt ?? now);
  if (since < config.graceMs) {
    return {
      tracker,
      repBanked: false,
      cue: "holding",
      inZoneMs: now - (tracker.enteredZoneAt ?? now),
    };
  }

  const heldFor = (tracker.lastInZoneAt ?? now) - (tracker.enteredZoneAt ?? now);
  const longEnough = heldFor >= config.minInZoneMs;
  const notTooSoon = now - tracker.lastRepAt >= config.minRepMs;

  if (longEnough && notTooSoon) {
    return {
      tracker: { ...initialRepTrackerState, lastRepAt: now },
      repBanked: true,
      cue: "counted",
      inZoneMs: 0,
    };
  }

  // Touched the zone and came straight back out: a bounce, or chatter on the
  // threshold. Reset without counting rather than inflate the number.
  return {
    tracker: { ...initialRepTrackerState, lastRepAt: tracker.lastRepAt },
    repBanked: false,
    cue: longEnough ? "ready" : "tooFast",
    inZoneMs: 0,
  };
}
