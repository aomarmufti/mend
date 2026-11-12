import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * "Line up" — can the camera see what it needs to before coaching starts?
 *
 * Pure, so it can be tested with synthetic landmarks. Every rule here is
 * geometric and generous on purpose: its job is to catch the setups that
 * would make the coach fail later (feet out of frame, facing the wrong way,
 * a dark room), not to demand a perfect pose.
 */

export type Framing = "side" | "front";
export type Posture = "standing" | "lying";

export type CheckId = "body" | "feet" | "orientation" | "light";

export interface FramingCheck {
  id: CheckId;
  ok: boolean;
  label: string;
}

export interface FramingResult {
  checks: FramingCheck[];
  ready: boolean;
  /** The one thing to do next, phrased as an instruction. */
  instruction: string;
}

const NOSE = 0;
const L_SH = 11;
const R_SH = 12;
const L_HIP = 23;
const R_HIP = 24;
const FEET = [27, 28, 29, 30, 31, 32];

const MIN_VIS = 0.5;
/** Normalised margin a landmark must sit inside to count as in frame. */
const EDGE = 0.015;
/** A body spanning less than this share of the frame is too far away to track well. */
const MIN_SPAN = 0.35;
/** Shoulder separation over torso length. Side-on shoulders overlap; front-on they are apart. */
const SIDE_MAX = 0.42;
const FRONT_MIN = 0.45;
/** Mean frame luminance, 0-1, below which pose tracking degrades badly. */
const MIN_LUMA = 0.16;

function seen(p: NormalizedLandmark | undefined): p is NormalizedLandmark {
  return !!p && (typeof p.visibility !== "number" || p.visibility >= MIN_VIS);
}

function inFrame(p: NormalizedLandmark): boolean {
  return p.x >= EDGE && p.x <= 1 - EDGE && p.y >= EDGE && p.y <= 1 - EDGE;
}

export function assessFraming(
  landmarks: NormalizedLandmark[] | null,
  aspect: number,
  framing: Framing,
  posture: Posture,
  luminance: number | null,
): FramingResult {
  const lightOk = luminance === null || luminance >= MIN_LUMA;
  const lightCheck: FramingCheck = { id: "light", ok: lightOk, label: lightOk ? "Lighting" : "Too dark" };
  const orientationLabel = framing === "side" ? "Side-on" : "Facing camera";

  if (!landmarks || landmarks.length < 33) {
    return {
      checks: [
        { id: "body", ok: false, label: "Head and hips" },
        { id: "feet", ok: false, label: "Feet in view" },
        { id: "orientation", ok: false, label: orientationLabel },
        lightCheck,
      ],
      ready: false,
      instruction: lightOk ? "Step into view so I can see you" : "Turn on a light, I can't see you",
    };
  }

  const nose = landmarks[NOSE];
  const hip = seen(landmarks[L_HIP]) ? landmarks[L_HIP] : seen(landmarks[R_HIP]) ? landmarks[R_HIP] : null;
  const headOk = seen(nose) && inFrame(nose);
  const bodyOk = headOk && !!hip && inFrame(hip);

  const feet = FEET.map((i) => landmarks[i]).filter(seen);
  const anklesSeen = seen(landmarks[27]) || seen(landmarks[28]);
  const feetOk = anklesSeen && feet.every(inFrame);

  // Span of the body across the frame, along whichever axis it lies on.
  const key = [NOSE, L_SH, R_SH, L_HIP, R_HIP, 27, 28].map((i) => landmarks[i]).filter(seen);
  const xs = key.map((p) => p.x);
  const ys = key.map((p) => p.y);
  const span =
    key.length >= 2
      ? posture === "lying"
        ? Math.max(...xs) - Math.min(...xs)
        : Math.max(...ys) - Math.min(...ys)
      : 0;
  const tooFar = bodyOk && feetOk && span < MIN_SPAN;

  // Orientation from shoulder separation relative to torso length.
  const ls = landmarks[L_SH];
  const rs = landmarks[R_SH];
  let orientationOk: boolean;
  if (seen(ls) && seen(rs) && hip) {
    const sx = (ls.x - rs.x) * aspect;
    const sy = ls.y - rs.y;
    const midX = ((ls.x + rs.x) / 2) * aspect;
    const midY = (ls.y + rs.y) / 2;
    const torso = Math.hypot(midX - hip.x * aspect, midY - hip.y) || 1;
    const ratio = Math.hypot(sx, sy) / torso;
    orientationOk = framing === "side" ? ratio <= SIDE_MAX : ratio >= FRONT_MIN;
  } else {
    // One shoulder hidden behind the other is what side-on looks like.
    orientationOk = framing === "side";
  }

  const checks: FramingCheck[] = [
    { id: "body", ok: bodyOk, label: "Head and hips" },
    { id: "feet", ok: feetOk && !tooFar, label: feetOk ? (tooFar ? "Too far away" : "Feet in view") : "Feet cut off" },
    { id: "orientation", ok: orientationOk, label: orientationLabel },
    lightCheck,
  ];

  let instruction: string;
  if (!hip && !headOk) instruction = "Step into view so I can see you";
  else if (!bodyOk || !feetOk) instruction = posture === "lying" ? "Move the phone back a little" : "Step back a little ↓";
  else if (tooFar) instruction = posture === "lying" ? "Move the phone a little closer" : "Come a little closer";
  else if (!orientationOk) instruction = framing === "side" ? "Turn side-on to the camera" : "Turn to face the camera";
  else if (!lightOk) instruction = "Turn on a light or face a window";
  else instruction = "Perfect. Hold still";

  return { checks, ready: checks.every((c) => c.ok), instruction };
}

/** Mean luminance of an RGBA buffer, 0-1. */
export function meanLuminance(data: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n ? sum / n / 255 : 0;
}
