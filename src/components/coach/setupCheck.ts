/**
 * Line-up: before the coach counts anything it checks the user is in a place
 * the pose model can actually read — whole body in frame, at a sensible
 * distance, centred, the right way round, in decent light and standing still.
 * Pure functions only (no DOM, no React) so each hint is unit tested.
 *
 * Coordinates: landmarks are the model's raw, un-mirrored image coordinates.
 * The on-screen preview is mirrored, so left/right hints are given from the
 * user's point of view (what they see in the mirror).
 */

export interface SetupLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export type Orientation = "side" | "front" | "any";

export interface SetupSpec {
  orientation: Orientation;
  /** Landmark indices that must be visible and inside the frame. */
  required: number[];
  /** Allowed body extent as a fraction of the frame's longer axis. */
  minExtent: number;
  maxExtent: number;
}

/** Shoulders, hips, knees, ankles: what every coached exercise reads. */
export const DEFAULT_REQUIRED = [11, 12, 23, 24, 25, 26, 27, 28];

export const DEFAULT_SETUP: SetupSpec = {
  orientation: "any",
  required: DEFAULT_REQUIRED,
  minExtent: 0.5,
  maxExtent: 0.88,
};

export type HintId =
  | "no-body"
  | "not-visible"
  | "step-back"
  | "come-closer"
  | "move-left"
  | "move-right"
  | "turn-side"
  | "face-camera"
  | "more-light"
  | "hold-still"
  | "ready";

export const HINT_COPY: Record<HintId, string> = {
  "no-body": "Step into view",
  "not-visible": "Get your whole body in view",
  "step-back": "Step back a little",
  "come-closer": "Come a little closer",
  "move-left": "Move a little to your left",
  "move-right": "Move a little to your right",
  "turn-side": "Turn side-on to the camera",
  "face-camera": "Face the camera",
  "more-light": "More light, please",
  "hold-still": "Hold still",
  ready: "Perfect",
};

export type CheckId = "distance" | "framing" | "angle" | "light";

export interface SetupCheck {
  id: CheckId;
  label: string;
  ok: boolean;
}

export interface SetupAssessment {
  /** Everything except stillness is fine. Stillness is the gate's job. */
  ready: boolean;
  hint: HintId;
  checks: SetupCheck[];
  /** Body centre (raw coords), used by the gate to measure stillness. */
  centre: { x: number; y: number } | null;
}

export interface FrameStats {
  /** Mean brightness of the frame, 0 to 1. null when not measured. */
  luma: number | null;
}

const VIS = 0.5;
const EDGE = 0.015;
const MIN_LUMA = 0.16;
/** Dead zone for centring, as fraction of frame width either side of centre. */
const CENTRE_TOL = 0.18;

function vis(p: SetupLandmark | undefined): number {
  return typeof p?.visibility === "number" ? p.visibility : 1;
}

export function assessSetup(
  landmarks: SetupLandmark[] | null,
  frame: FrameStats,
  aspect: number,
  spec: SetupSpec = DEFAULT_SETUP,
): SetupAssessment {
  const mk = (
    hint: HintId,
    ok: Partial<Record<CheckId, boolean>>,
    centre: SetupAssessment["centre"] = null,
  ): SetupAssessment => {
    const checks: SetupCheck[] = [
      { id: "distance", label: "Distance", ok: ok.distance ?? false },
      { id: "framing", label: "Framing", ok: ok.framing ?? false },
      { id: "angle", label: "Angle", ok: ok.angle ?? false },
      { id: "light", label: "Light", ok: ok.light ?? true },
    ];
    return { ready: hint === "ready" || hint === "hold-still", hint, checks, centre };
  };

  const lightOk = frame.luma === null || frame.luma >= MIN_LUMA;

  if (!landmarks || landmarks.length === 0) {
    return mk("no-body", { light: lightOk });
  }

  // Required joints must be readable AND inside the frame.
  const req = spec.required.map((i) => landmarks[i]);
  const readable = req.every((p) => p && vis(p) >= VIS);
  const inFrame = req.every(
    (p) => p && p.x > EDGE && p.x < 1 - EDGE && p.y > EDGE && p.y < 1 - EDGE,
  );

  const pts = landmarks.filter((p) => vis(p) >= VIS);
  if (pts.length === 0) return mk("no-body", { light: lightOk });

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  // Longer axis, so a person lying down is judged by their length, not height.
  const extent = Math.max(maxY - minY, maxX - minX);

  const distanceOk = extent >= spec.minExtent && extent <= spec.maxExtent;
  // Mirrored preview: displayed x = 1 - raw x.
  const displayedCx = 1 - centre.x;
  const centred = Math.abs(displayedCx - 0.5) <= CENTRE_TOL;

  let angleOk = true;
  let angleHint: HintId = "ready";
  if (spec.orientation !== "any") {
    const ls = landmarks[11], rs = landmarks[12], lh = landmarks[23], rh = landmarks[24];
    if (ls && rs && lh && rh && vis(ls) >= VIS && vis(rs) >= VIS && vis(lh) >= VIS && vis(rh) >= VIS) {
      const shoulderGap = Math.abs(ls.x - rs.x) * aspect;
      const torso = Math.hypot(
        ((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2) * aspect,
        (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2,
      );
      const ratio = torso > 0 ? shoulderGap / torso : 0;
      if (spec.orientation === "side" && ratio > 0.55) {
        angleOk = false;
        angleHint = "turn-side";
      } else if (spec.orientation === "front" && ratio < 0.5) {
        angleOk = false;
        angleHint = "face-camera";
      }
    }
  }

  const ok = { distance: distanceOk, framing: readable && inFrame && centred, angle: angleOk, light: lightOk };

  if (!readable || !inFrame) {
    // Too big for the frame is the usual reason joints fall off the edge.
    if (extent > spec.maxExtent || !inFrame) return mk("step-back", ok, centre);
    return mk("not-visible", ok, centre);
  }
  if (extent > spec.maxExtent) return mk("step-back", ok, centre);
  if (extent < spec.minExtent) return mk("come-closer", ok, centre);
  if (!centred) return mk(displayedCx < 0.5 ? "move-right" : "move-left", ok, centre);
  if (!angleOk) return mk(angleHint, ok, centre);
  if (!lightOk) return mk("more-light", ok, centre);
  return mk("ready", ok, centre);
}

// ---------------------------------------------------------------------------
// Gate: ready -> still for a moment -> 3, 2, 1 -> go. Any slip resets it.

export type GatePhase = "aligning" | "steadying" | "countdown" | "go";

export interface GateState {
  phase: GatePhase;
  /** When the current run of "ready" began (ms), or null. */
  readySince: number | null;
  countdownStart: number | null;
  lastCentre: { x: number; y: number } | null;
  lastAt: number | null;
  lastMovingAt: number;
}

export const initialGate: GateState = {
  phase: "aligning",
  readySince: null,
  countdownStart: null,
  lastCentre: null,
  lastAt: null,
  lastMovingAt: 0,
};

/** How long the user must be ready and still before the countdown starts. */
export const STEADY_MS = 600;
export const COUNT_STEP_MS = 1000;
/** Centre speed (fraction of frame per second) above which they are "moving". */
const MOVING_SPEED = 0.2;

export interface GateStep {
  state: GateState;
  /** What to tell the user right now. */
  hint: HintId;
  /** 3, 2, 1 while counting down, else null. */
  count: number | null;
  go: boolean;
}

export function stepGate(prev: GateState, a: SetupAssessment, now: number): GateStep {
  // Stillness from how fast the body centre is travelling.
  let lastMovingAt = prev.lastMovingAt;
  if (a.centre && prev.lastCentre && prev.lastAt !== null && now > prev.lastAt) {
    const dt = (now - prev.lastAt) / 1000;
    const speed = Math.hypot(a.centre.x - prev.lastCentre.x, a.centre.y - prev.lastCentre.y) / dt;
    if (speed > MOVING_SPEED) lastMovingAt = now;
  }
  const base = { ...prev, lastCentre: a.centre, lastAt: now, lastMovingAt };

  if (prev.phase === "go") return { state: { ...base, phase: "go" }, hint: "ready", count: null, go: true };

  if (!a.ready) {
    return {
      state: { ...base, phase: "aligning", readySince: null, countdownStart: null },
      hint: a.hint,
      count: null,
      go: false,
    };
  }

  const readySince = prev.readySince ?? now;
  const still = now - lastMovingAt >= 300;

  if (prev.phase === "countdown" && prev.countdownStart !== null) {
    // Leaving position during the count cancels it (handled by !a.ready
    // above); walking about does too.
    if (!still) {
      return {
        state: { ...base, phase: "steadying", readySince: now, countdownStart: null },
        hint: "hold-still",
        count: null,
        go: false,
      };
    }
    const step = Math.floor((now - prev.countdownStart) / COUNT_STEP_MS);
    if (step >= 3) {
      return { state: { ...base, phase: "go", readySince }, hint: "ready", count: null, go: true };
    }
    return {
      state: { ...base, phase: "countdown", readySince },
      hint: "ready",
      count: 3 - step,
      go: false,
    };
  }

  if (!still || now - readySince < STEADY_MS) {
    return {
      state: { ...base, phase: "steadying", readySince: still ? readySince : now, countdownStart: null },
      hint: "hold-still",
      count: null,
      go: false,
    };
  }

  return {
    state: { ...base, phase: "countdown", readySince, countdownStart: now },
    hint: "ready",
    count: 3,
    go: false,
  };
}

/** Mean luminance of an RGBA buffer, 0 to 1. Feeds `FrameStats.luma`. */
export function meanLuminance(data: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n ? sum / n / 255 : 0;
}
