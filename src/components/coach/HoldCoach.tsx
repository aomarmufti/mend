"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  NormalizedLandmark,
  PoseLandmarker as PoseLandmarkerType,
} from "@mediapipe/tasks-vision";
import {
  LANDMARK,
  jointAngle,
  type Point,
} from "@/components/coach/poseMath";
import {
  trackHold,
  initialHoldTracker,
  moreLiftedSide,
  DEFAULT_HOLD_CONFIG,
  type HoldTracker,
  type HoldCue,
  type HoldConfig,
} from "@/components/coach/holdMath";
import { logExercise } from "@/lib/exerciseLog";
import { readActiveConditionSlug } from "@/lib/activeCondition";
import { markCompletedToday } from "@/lib/localSession";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const CALIBRATION_FRAMES = 30;
const UI_INTERVAL_MS = 100;

/**
 * How a hold exercise decides "is the user in position right now". Two
 * shapes, chosen per exercise based on what the tracked joints actually see:
 *
 * - legExtension: a knee/hip angle band. Use this when the hands are not
 *   near the tracked joints, so angle tracking stays clean (confirmed
 *   against real footage for the single-leg active knee extension stretch).
 * - footLift: normalised ankle lift versus a calibrated baseline. Use this
 *   when the hands clasp near the hip or knee — verified against real
 *   footage that hip/knee angles become unreliable there (swinging by tens
 *   of degrees frame to frame at "confident" visibility), while the ankle,
 *   untouched by the hands, stays stable.
 */
export type HoldSignal =
  | { kind: "legExtension"; kneeMinDeg: number; hipMinDeg: number; hipMaxDeg: number }
  | { kind: "footLift"; minLift: number };

export interface HoldExerciseConfig {
  slug: string;
  name: string;
  signal: HoldSignal;
  targetReps: number;
  hold?: Partial<HoldConfig>;
  /** Shown once, before calibration — how to position the camera. */
  setupHint: string;
}

interface Baselines {
  hipY: { left: number | null; right: number | null };
  ankleY: { left: number | null; right: number | null };
  torsoLength: number | null;
}

const emptyBaselines: Baselines = {
  hipY: { left: null, right: null },
  ankleY: { left: null, right: null },
  torsoLength: null,
};

function visibilityOf(p: NormalizedLandmark): number {
  return typeof p.visibility === "number" ? p.visibility : 1;
}

function correct(p: NormalizedLandmark, aspect: number): Point {
  return { x: p.x * aspect, y: p.y };
}

function torsoLengthOf(landmarks: NormalizedLandmark[], aspect: number): number | null {
  const shoulder = landmarks[LANDMARK.leftShoulder] ?? landmarks[LANDMARK.rightShoulder];
  const hip = landmarks[LANDMARK.leftHip] ?? landmarks[LANDMARK.rightHip];
  if (!shoulder || !hip) return null;
  const a = correct(shoulder, aspect);
  const b = correct(hip, aspect);
  const length = Math.hypot(a.x - b.x, a.y - b.y);
  return length > 0 ? length : null;
}

/** Evaluate the configured signal for one leg; returns null if not visible enough. */
function legInPosition(
  side: "left" | "right",
  landmarks: NormalizedLandmark[],
  aspect: number,
  signal: HoldSignal,
): { inPosition: boolean; kneeAngle: number | null } | null {
  const hip = landmarks[side === "left" ? LANDMARK.leftHip : LANDMARK.rightHip];
  const knee = landmarks[side === "left" ? LANDMARK.leftKnee : LANDMARK.rightKnee];
  const ankle = landmarks[side === "left" ? LANDMARK.leftAnkle : LANDMARK.rightAnkle];
  const shoulder = landmarks[side === "left" ? LANDMARK.leftShoulder : LANDMARK.rightShoulder];
  if (!hip || !knee || !ankle) return null;
  if (Math.min(visibilityOf(hip), visibilityOf(knee), visibilityOf(ankle)) < 0.5) return null;

  const kneeAngle = jointAngle(correct(hip, aspect), correct(knee, aspect), correct(ankle, aspect));

  if (signal.kind === "legExtension") {
    if (!shoulder) return null;
    const hipAngle = jointAngle(correct(shoulder, aspect), correct(hip, aspect), correct(knee, aspect));
    const inPosition =
      kneeAngle >= signal.kneeMinDeg && hipAngle >= signal.hipMinDeg && hipAngle <= signal.hipMaxDeg;
    return { inPosition, kneeAngle };
  }

  // footLift: caller supplies the lift via moreLiftedSide separately, since it
  // needs a calibrated baseline this function does not have. Angle is still
  // reported for the on-screen readout.
  return { inPosition: false, kneeAngle };
}

const CUE_COPY: Record<HoldCue, (targetSec: number, remainingReps: number) => string> = {
  seek: () => "Get into position to begin.",
  holding: () => "Hold…",
  nearly: () => "Nearly there — hold it.",
  banked: (_t, remaining) =>
    remaining > 0 ? "Rep complete! Release, then get set for the next one." : "Last rep complete — nice work.",
  "released-early": () => "So close — try to hold a little longer next time.",
};

interface UiState {
  cue: HoldCue;
  elapsedSec: number;
  targetSec: number;
  reps: number;
  targetReps: number;
  kneeAngleDeg: number | null;
  message: string;
}

function initialUi(cfg: HoldExerciseConfig): UiState {
  return {
    cue: "seek",
    elapsedSec: 0,
    targetSec: Math.round((cfg.hold?.minHoldMs ?? DEFAULT_HOLD_CONFIG.minHoldMs) / 1000),
    reps: 0,
    targetReps: cfg.targetReps,
    kneeAngleDeg: null,
    message: cfg.setupHint,
  };
}

async function createLandmarker(
  vision: Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>,
  PoseLandmarker: typeof import("@mediapipe/tasks-vision").PoseLandmarker,
): Promise<PoseLandmarkerType> {
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(vision, options("GPU"));
  } catch {
    return await PoseLandmarker.createFromOptions(vision, options("CPU"));
  }
}

export interface HoldCoachProps {
  config: HoldExerciseConfig;
  onFinish?: (result: { reps: number }) => void;
  finishLabel?: string;
}

type Status = "idle" | "requesting" | "loading-model" | "calibrating" | "tracking" | "error";

export function HoldCoach({ config, onFinish, finishLabel }: HoldCoachProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);

  const baselineRef = useRef<Baselines>(emptyBaselines);
  const calibFramesRef = useRef(0);
  const calibSumsRef = useRef({ hipY: { left: 0, right: 0 }, ankleY: { left: 0, right: 0 }, torso: 0 });

  const holdTrackerRef = useRef<HoldTracker>(initialHoldTracker);
  const repsRef = useRef(0);
  const lastUiRef = useRef(0);
  const startedAtRef = useRef(0);
  const activeSideRef = useRef<"left" | "right" | null>(null);

  const holdConfig: HoldConfig = { ...DEFAULT_HOLD_CONFIG, ...config.hold };

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>(() => initialUi(config));

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      setStatus("requesting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 960, height: 540 },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Camera permission was denied or no camera is available.");
        setStatus("error");
        return;
      }
      if (cancelled) return;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      setStatus("loading-model");
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        const landmarker = await createLandmarker(vision, PoseLandmarker);
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Couldn't load the pose model — check your internet connection.");
        setStatus("error");
        return;
      }

      startedAtRef.current = Date.now();
      setStatus("calibrating");
      loop();
    }

    function loop() {
      const process = () => {
        if (cancelled) return;
        tick();
        rafRef.current = requestAnimationFrame(process);
      };
      rafRef.current = requestAnimationFrame(process);
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      const now = performance.now();
      let landmarks: NormalizedLandmark[] | null = null;

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const result = landmarker.detectForVideo(video, now);
          landmarks = result.landmarks[0] ?? null;
          lastLandmarksRef.current = landmarks;
        } catch {
          /* a dropped frame is not worth tearing the loop down for */
        }
      } else {
        landmarks = lastLandmarksRef.current;
      }

      const aspect = video.videoWidth / video.videoHeight;

      // Calibrate resting hip/ankle height and torso length before judging
      // position, same pattern as PoseCoach's hip-rise calibration.
      const b = baselineRef.current;
      if (calibFramesRef.current < CALIBRATION_FRAMES && landmarks) {
        const torso = torsoLengthOf(landmarks, aspect);
        const leftHip = landmarks[LANDMARK.leftHip];
        const rightHip = landmarks[LANDMARK.rightHip];
        const leftAnkle = landmarks[LANDMARK.leftAnkle];
        const rightAnkle = landmarks[LANDMARK.rightAnkle];
        if (torso) {
          const sums = calibSumsRef.current;
          sums.torso += torso;
          if (leftHip && visibilityOf(leftHip) >= 0.5) sums.hipY.left += leftHip.y;
          if (rightHip && visibilityOf(rightHip) >= 0.5) sums.hipY.right += rightHip.y;
          if (leftAnkle && visibilityOf(leftAnkle) >= 0.5) sums.ankleY.left += leftAnkle.y;
          if (rightAnkle && visibilityOf(rightAnkle) >= 0.5) sums.ankleY.right += rightAnkle.y;
          calibFramesRef.current += 1;
          if (calibFramesRef.current >= CALIBRATION_FRAMES) {
            const n = calibFramesRef.current;
            baselineRef.current = {
              hipY: { left: sums.hipY.left / n || null, right: sums.hipY.right / n || null },
              ankleY: { left: sums.ankleY.left / n || null, right: sums.ankleY.right / n || null },
              torsoLength: sums.torso / n,
            };
            setStatus("tracking");
          }
        }
      }

      let inPosition = false;
      let kneeAngleDeg: number | null = null;
      let drawSide: "left" | "right" | null = null;

      if (landmarks && b.torsoLength) {
        if (config.signal.kind === "legExtension") {
          const left = legInPosition("left", landmarks, aspect, config.signal);
          const right = legInPosition("right", landmarks, aspect, config.signal);
          const candidate =
            left && right
              ? left.inPosition
                ? { side: "left" as const, ...left }
                : { side: "right" as const, ...right }
              : left
                ? { side: "left" as const, ...left }
                : right
                  ? { side: "right" as const, ...right }
                  : null;
          if (candidate) {
            inPosition = candidate.inPosition;
            kneeAngleDeg = candidate.kneeAngle;
            drawSide = candidate.side;
          }
        } else {
          const lifted = moreLiftedSide(landmarks, b.ankleY, b.torsoLength);
          if (lifted) {
            inPosition = lifted.lift >= config.signal.minLift;
            drawSide = lifted.side;
            const legCheck = legInPosition(lifted.side, landmarks, aspect, config.signal);
            kneeAngleDeg = legCheck?.kneeAngle ?? null;
          }
        }
      }
      activeSideRef.current = drawSide;

      const result = trackHold(holdTrackerRef.current, inPosition, now, holdConfig);
      holdTrackerRef.current = result.tracker;
      if (result.repBanked) {
        repsRef.current = Math.min(repsRef.current + 1, config.targetReps);
      }

      drawFrame(canvas, video, landmarks, drawSide, result.cue);

      if (now - lastUiRef.current > UI_INTERVAL_MS) {
        lastUiRef.current = now;
        const remaining = Math.max(0, config.targetReps - repsRef.current);
        setUi({
          cue: result.cue,
          elapsedSec: Math.floor(result.elapsedMs / 1000),
          targetSec: Math.round(holdConfig.minHoldMs / 1000),
          reps: repsRef.current,
          targetReps: config.targetReps,
          kneeAngleDeg,
          message: landmarks
            ? CUE_COPY[result.cue](holdConfig.minHoldMs / 1000, remaining)
            : "Looking for you — make sure your whole body is in frame.",
        });
      }
    }

    function drawFrame(
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      landmarks: NormalizedLandmark[] | null,
      side: "left" | "right" | null,
      cue: HoldCue,
    ) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!landmarks || landmarks.length === 0) return;
      renderSkeleton(ctx, canvas, landmarks, side, cue);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // config is provided by the parent and not expected to change identity
    // mid-session; re-running this effect would tear down an active camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = useCallback(() => {
    logExercise({
      conditionSlug: readActiveConditionSlug(),
      exerciseSlug: config.slug,
      exerciseName: config.name,
      reps: repsRef.current,
      sets: 1,
      durationMs: startedAtRef.current ? Date.now() - startedAtRef.current : 0,
      avgScore: null,
    });
    if (repsRef.current > 0) markCompletedToday();
    if (onFinish) onFinish({ reps: repsRef.current });
    else router.push("/progress");
  }, [router, onFinish, config.slug, config.name]);

  const busy = status !== "tracking" && status !== "calibrating";
  const progressPct = ui.targetSec > 0 ? Math.min(100, (ui.elapsedSec / ui.targetSec) * 100) : 0;

  const cueClass =
    ui.cue === "banked"
      ? "bg-moss/10 text-moss"
      : ui.cue === "nearly"
        ? "bg-amber/10 text-amber"
        : ui.cue === "released-early"
          ? "bg-coral/10 text-coral"
          : "bg-white/60 text-ink/70";

  return (
    <div className="space-y-4 px-5 pt-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink">
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/70 px-6 text-center">
            <p className="font-sans text-sm text-paper">
              {status === "idle" && "Starting camera…"}
              {status === "requesting" && "Requesting camera permission…"}
              {status === "loading-model" && "Loading pose model…"}
              {status === "error" && (error ?? "Camera unavailable. Check permissions and try again.")}
            </p>
          </div>
        )}

        {status === "calibrating" && (
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full bg-ink/70 px-3 py-1 font-sans text-[11px] text-paper/90">
              Hold still — finding your resting position
            </span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-moss" />
          <span className="font-sans text-[10px] font-medium text-paper/90">
            Processed on-device — nothing uploaded
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-mist bg-white/60 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-sans text-sm font-semibold text-ink">{config.name} — live check</h3>
          <span className="font-mono text-sm font-semibold text-ink/50">
            Rep {Math.min(ui.reps + 1, ui.targetReps)} of {ui.targetReps}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#E7DFCC" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={ui.cue === "banked" ? "#4B7A63" : ui.cue === "nearly" ? "#D98A3A" : "#1C332B"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progressPct / 100)}`}
                className="transition-all duration-150"
              />
            </svg>
            <span className="font-mono text-2xl font-semibold text-pine">{ui.elapsedSec}s</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-paper px-3 py-2.5 text-center">
            <p className="font-mono text-xl font-semibold text-pine">{ui.reps}</p>
            <p className="font-sans text-[11px] text-ink/50">Reps complete</p>
          </div>
          <div className="rounded-xl bg-paper px-3 py-2.5 text-center">
            <p className="font-mono text-xl font-semibold text-pine">
              {ui.targetSec}
              <span className="text-xs text-ink/40">s</span>
            </p>
            <p className="font-sans text-[11px] text-ink/50">Target hold</p>
          </div>
        </div>

        {ui.kneeAngleDeg !== null && (
          <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink/50">
            <span>Knee angle</span>
            <span>{Math.round(ui.kneeAngleDeg)}°</span>
          </div>
        )}

        <p className={`mt-3 rounded-xl px-3 py-2 font-sans text-sm ${cueClass}`}>{ui.message}</p>

        <button
          type="button"
          onClick={endSession}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-amber py-3 font-sans text-sm font-semibold text-ink transition hover:opacity-90"
        >
          {finishLabel ?? "End session & save"}
        </button>
      </div>
    </div>
  );
}

function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  side: "left" | "right" | null,
  cue: HoldCue,
) {
  const w = canvas.width;
  const h = canvas.height;
  const toXY = (p: NormalizedLandmark) => ({ x: p.x * w, y: p.y * h });

  const neutral = "#F5F3EDaa";
  const activeColor =
    cue === "banked" ? "#4B7A63" : cue === "nearly" ? "#D98A3A" : cue === "released-early" ? "#BE4B3C" : "#1C332B";

  const indices =
    side === "left"
      ? { hip: LANDMARK.leftHip, knee: LANDMARK.leftKnee, ankle: LANDMARK.leftAnkle }
      : side === "right"
        ? { hip: LANDMARK.rightHip, knee: LANDMARK.rightKnee, ankle: LANDMARK.rightAnkle }
        : null;

  const connections: [number, number][] = [
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15], [12, 14], [14, 16],
    [23, 25], [25, 27], [24, 26], [26, 28],
    [27, 29], [29, 31], [28, 30], [30, 32],
  ];

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [a, b] of connections) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    const isActiveLeg =
      indices !== null &&
      (a === indices.hip || a === indices.knee || a === indices.ankle) &&
      (b === indices.hip || b === indices.knee || b === indices.ankle);
    ctx.strokeStyle = isActiveLeg ? activeColor : neutral;
    const { x: x1, y: y1 } = toXY(p1);
    const { x: x2, y: y2 } = toXY(p2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  landmarks.forEach((lm, i) => {
    const { x, y } = toXY(lm);
    const isActive = indices !== null && (i === indices.hip || i === indices.knee || i === indices.ankle);
    ctx.fillStyle = isActive ? activeColor : neutral;
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
  });
}
