import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type Side = "left" | "right";

/** Landmarks below this confidence are treated as not seen at all. */
export const MIN_VISIBILITY = 0.5;

// Heuristic thresholds tuned by eye for the demo, not clinically validated.
// depthRatio is ankle-to-hip horizontal distance over torso length: it shrinks
// as the heel slides in, so lower is deeper.
export const TARGET = {
  depthRatio: 0.85,
  depthTolerance: 0.35,
  hipRise: 0.035,
  hipRiseTolerance: 0.05,
} as const;

/** At or above GOOD reads as "good"; below CLOSE reads as "off". */
export const GOOD = 85;
export const CLOSE = 60;

export type CheckStatus = "good" | "close" | "off";

export interface Point {
  x: number;
  y: number;
}

export interface LegGeometry {
  side: Side;
  hip: NormalizedLandmark;
  knee: NormalizedLandmark;
  ankle: NormalizedLandmark;
  visibility: number;
  kneeAngleDeg: number;
  ankleHipHorizontalDist: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function visibilityOf(p: NormalizedLandmark): number {
  return typeof p.visibility === "number" ? p.visibility : 1;
}

/**
 * Landmarks are normalised 0–1 on *both* axes, so on a non-square frame the
 * x axis is compressed relative to y. Every angle and distance below is taken
 * in this corrected space — without it a true 45° movement on a 16:9 feed
 * measures as roughly 29°.
 */
function correct(p: NormalizedLandmark, aspect: number): Point {
  return { x: p.x * aspect, y: p.y };
}

/** Angle at the `b` vertex of a–b–c, in degrees (0–180). */
export function jointAngle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = clamp((v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle at the knee vertex between the hip and ankle, in degrees. */
export function kneeAngle(
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  ankle: NormalizedLandmark,
  aspect = 1
): number {
  return jointAngle(
    correct(hip, aspect),
    correct(knee, aspect),
    correct(ankle, aspect)
  );
}

function legGeometry(
  landmarks: NormalizedLandmark[],
  side: Side,
  aspect: number
): LegGeometry | null {
  const hip = landmarks[side === "left" ? LANDMARK.leftHip : LANDMARK.rightHip];
  const knee = landmarks[side === "left" ? LANDMARK.leftKnee : LANDMARK.rightKnee];
  const ankle = landmarks[side === "left" ? LANDMARK.leftAnkle : LANDMARK.rightAnkle];
  if (!hip || !knee || !ankle) return null;

  const visibility = Math.min(
    visibilityOf(hip),
    visibilityOf(knee),
    visibilityOf(ankle)
  );
  if (visibility < MIN_VISIBILITY) return null;

  const correctedHip = correct(hip, aspect);
  const correctedAnkle = correct(ankle, aspect);

  return {
    side,
    hip,
    knee,
    ankle,
    visibility,
    kneeAngleDeg: kneeAngle(hip, knee, ankle, aspect),
    ankleHipHorizontalDist: Math.abs(correctedAnkle.x - correctedHip.x),
  };
}

/**
 * The heel-slide bends one leg at a time — track whichever is more flexed.
 * A leg whose landmarks are not confidently visible is skipped rather than
 * scored, so the far leg hidden behind the near one cannot win the comparison
 * on the strength of a guessed position.
 */
export function activeLeg(
  landmarks: NormalizedLandmark[],
  aspect = 1
): LegGeometry | null {
  const candidates = [
    legGeometry(landmarks, "left", aspect),
    legGeometry(landmarks, "right", aspect),
  ].filter((leg): leg is LegGeometry => leg !== null);

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.kneeAngleDeg <= b.kneeAngleDeg ? a : b));
}

/**
 * Shoulder-to-hip distance, used to make the depth measurement independent of
 * how far the person is from the camera. Falls back to the other side when one
 * shoulder or hip is not confidently visible.
 */
export function torsoLength(landmarks: NormalizedLandmark[], aspect = 1): number {
  const pairs: [number, number][] = [
    [LANDMARK.leftShoulder, LANDMARK.leftHip],
    [LANDMARK.rightShoulder, LANDMARK.rightHip],
  ];

  for (const [shoulderIndex, hipIndex] of pairs) {
    const shoulder = landmarks[shoulderIndex];
    const hip = landmarks[hipIndex];
    if (!shoulder || !hip) continue;
    if (Math.min(visibilityOf(shoulder), visibilityOf(hip)) < MIN_VISIBILITY) continue;
    const a = correct(shoulder, aspect);
    const b = correct(hip, aspect);
    const length = Math.hypot(a.x - b.x, a.y - b.y);
    if (length > 0) return length;
  }
  return 1;
}

export function statusOf(subScore: number): CheckStatus {
  if (subScore >= GOOD) return "good";
  if (subScore >= CLOSE) return "close";
  return "off";
}

/**
 * Graded 0–100 rather than pass/fail. A pair of binary checks can only ever
 * produce four distinct totals, which reads on screen as a number stuck on one
 * of a few values; a continuous score moves as the user corrects their form.
 */
export function depthScore(depthRatio: number): number {
  const miss = Math.max(0, depthRatio - TARGET.depthRatio);
  return clamp(100 - (miss / TARGET.depthTolerance) * 100, 0, 100);
}

export function pelvisScore(hipRise: number): number {
  const miss = Math.max(0, hipRise - TARGET.hipRise);
  return clamp(100 - (miss / TARGET.hipRiseTolerance) * 100, 0, 100);
}

export interface FrameAnalysis {
  side: Side;
  kneeAngleDeg: number;
  depthRatio: number;
  hipRise: number;
  depth: number;
  pelvis: number;
  depthStatus: CheckStatus;
  pelvisStatus: CheckStatus;
  matchPct: number;
  caption: string;
  inGoodZone: boolean;
  indices: { hip: number; knee: number; ankle: number };
}

/**
 * Score a single frame. `hipBaseline` is the resting hip height captured during
 * calibration; while it is still null the pelvis check is treated as clean
 * rather than penalising the user against a baseline nobody has measured yet.
 *
 * Returns null when the leg cannot be seen confidently, so the caller can hold
 * the last good reading instead of dropping the score to zero mid-rep.
 */
export function analyseFrame(
  landmarks: NormalizedLandmark[] | null | undefined,
  aspect = 1,
  hipBaseline: number | null = null
): FrameAnalysis | null {
  if (!landmarks || landmarks.length <= LANDMARK.rightAnkle) return null;

  const leg = activeLeg(landmarks, aspect);
  if (!leg) return null;

  const depthRatio = leg.ankleHipHorizontalDist / torsoLength(landmarks, aspect);
  const hipRise = hipBaseline !== null ? hipBaseline - leg.hip.y : 0;

  const depth = depthScore(depthRatio);
  const pelvis = pelvisScore(hipRise);
  const matchPct = Math.round(depth * 0.6 + pelvis * 0.4);

  let caption: string;
  if (pelvis < GOOD) {
    caption = "Keep your lower back flat on the mat — you're arching to help the slide.";
  } else if (depth >= GOOD) {
    caption = "Nice depth — hold, then slide back with control.";
  } else {
    caption = "Slide your heel further toward you";
  }

  return {
    side: leg.side,
    kneeAngleDeg: leg.kneeAngleDeg,
    depthRatio,
    hipRise,
    depth,
    pelvis,
    depthStatus: statusOf(depth),
    pelvisStatus: statusOf(pelvis),
    matchPct,
    caption,
    inGoodZone: depth >= GOOD && pelvis >= GOOD,
    indices:
      leg.side === "left"
        ? { hip: LANDMARK.leftHip, knee: LANDMARK.leftKnee, ankle: LANDMARK.leftAnkle }
        : { hip: LANDMARK.rightHip, knee: LANDMARK.rightKnee, ankle: LANDMARK.rightAnkle },
  };
}
