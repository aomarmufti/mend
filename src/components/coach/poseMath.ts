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

export interface LegGeometry {
  side: Side;
  hip: NormalizedLandmark;
  knee: NormalizedLandmark;
  ankle: NormalizedLandmark;
  kneeAngleDeg: number;
  ankleHipHorizontalDist: number;
}

/** Angle at the knee vertex between the hip and ankle, in degrees. */
export function kneeAngle(
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  ankle: NormalizedLandmark
): number {
  const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
  const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function legGeometry(
  landmarks: NormalizedLandmark[],
  side: Side
): LegGeometry {
  const hip = landmarks[side === "left" ? LANDMARK.leftHip : LANDMARK.rightHip];
  const knee = landmarks[side === "left" ? LANDMARK.leftKnee : LANDMARK.rightKnee];
  const ankle = landmarks[side === "left" ? LANDMARK.leftAnkle : LANDMARK.rightAnkle];
  return {
    side,
    hip,
    knee,
    ankle,
    kneeAngleDeg: kneeAngle(hip, knee, ankle),
    ankleHipHorizontalDist: Math.abs(ankle.x - hip.x),
  };
}

/** The heel-slide exercise bends one leg at a time — track whichever is more flexed. */
export function activeLeg(landmarks: NormalizedLandmark[]): LegGeometry {
  const left = legGeometry(landmarks, "left");
  const right = legGeometry(landmarks, "right");
  return left.kneeAngleDeg < right.kneeAngleDeg ? left : right;
}

export function torsoLength(landmarks: NormalizedLandmark[]): number {
  const shoulder = landmarks[LANDMARK.leftShoulder];
  const hip = landmarks[LANDMARK.leftHip];
  return Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) || 1;
}
