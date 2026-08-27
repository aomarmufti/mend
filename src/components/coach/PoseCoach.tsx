"use client";

import { useEffect, useRef, useState } from "react";
import type {
  NormalizedLandmark,
  PoseLandmarker as PoseLandmarkerType,
} from "@mediapipe/tasks-vision";
import {
  analyseFrame,
  activeLeg,
  type CheckStatus,
  type FrameAnalysis,
} from "@/components/coach/poseMath";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const CALIBRATION_FRAMES = 30;
/** Weight of each new frame in the displayed score. Lower = steadier. */
const SMOOTHING = 0.2;
/** The canvas redraws every frame; React only needs to repaint this often. */
const UI_INTERVAL_MS = 100;

const COLOR: Record<CheckStatus, string> = {
  good: "#4B7A63", // moss
  close: "#D98A3A", // amber
  off: "#BE4B3C", // coral
};

const TEXT_CLASS: Record<CheckStatus, string> = {
  good: "text-moss",
  close: "text-amber",
  off: "text-coral",
};

const DOT_CLASS: Record<CheckStatus, string> = {
  good: "bg-moss",
  close: "bg-amber",
  off: "bg-coral",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  good: "Good",
  close: "Almost",
  off: "Needs work",
};

type Status = "idle" | "requesting" | "loading-model" | "calibrating" | "tracking" | "error";

interface UiState {
  matchPct: number | null;
  kneeAngleDeg: number;
  depthStatus: CheckStatus;
  pelvisStatus: CheckStatus;
  caption: string;
  reps: number;
}

const initialUi: UiState = {
  matchPct: null,
  kneeAngleDeg: 0,
  depthStatus: "off",
  pelvisStatus: "good",
  caption: "Lie down side-on to the camera to begin.",
  reps: 0,
};

async function createLandmarker(
  vision: Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>,
  PoseLandmarker: typeof import("@mediapipe/tasks-vision").PoseLandmarker
): Promise<PoseLandmarkerType> {
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(vision, options("GPU"));
  } catch {
    // Not every device exposes a usable GPU delegate — CPU is slower but works.
    return await PoseLandmarker.createFromOptions(vision, options("CPU"));
  }
}

export function PoseCoach() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  const hipBaselineRef = useRef<{ sum: number; count: number; value: number | null }>({
    sum: 0,
    count: 0,
    value: null,
  });

  // Hot-path state lives in refs: touching React state every frame would
  // re-render the whole tree 30–60 times a second for no visible gain.
  const smoothRef = useRef<number | null>(null);
  const lastFrameRef = useRef<FrameAnalysis | null>(null);
  const inZoneRef = useRef(false);
  const repsRef = useRef(0);
  const lastUiRef = useRef(0);
  const captionRef = useRef(initialUi.caption);
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>(initialUi);

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

      // detectForVideo needs strictly increasing timestamps and re-running it on
      // a frame the camera has not yet replaced is wasted work, so only detect
      // once the video clock has actually advanced.
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

      // Calibrate the resting hip height before judging pelvic lift, and only
      // from frames where the leg is actually visible.
      const baseline = hipBaselineRef.current;
      if (baseline.count < CALIBRATION_FRAMES && landmarks) {
        const leg = activeLeg(landmarks, aspect);
        if (leg) {
          baseline.sum += leg.hip.y;
          baseline.count += 1;
          if (baseline.count >= CALIBRATION_FRAMES) {
            baseline.value = baseline.sum / baseline.count;
            setStatus("tracking");
          }
        }
      }

      const frame = analyseFrame(landmarks, aspect, baseline.value);

      if (frame) {
        lastFrameRef.current = frame;
        captionRef.current = frame.caption;
        smoothRef.current =
          smoothRef.current === null
            ? frame.matchPct
            : smoothRef.current + (frame.matchPct - smoothRef.current) * SMOOTHING;

        if (frame.inGoodZone) {
          inZoneRef.current = true;
        } else if (inZoneRef.current) {
          inZoneRef.current = false;
          repsRef.current += 1;
        }
      } else if (landmarks) {
        captionRef.current = "Move so your hip, knee and ankle are all in shot.";
      } else {
        captionRef.current = "Looking for you — lie side-on to the camera.";
      }

      drawFrame(canvas, video, landmarks, frame);

      if (now - lastUiRef.current > UI_INTERVAL_MS) {
        lastUiRef.current = now;
        const last = lastFrameRef.current;
        setUi({
          // Holding the last smoothed score keeps the number steady through a
          // dropped frame instead of flashing to zero and back.
          matchPct: smoothRef.current === null ? null : Math.round(smoothRef.current),
          kneeAngleDeg: last?.kneeAngleDeg ?? 0,
          depthStatus: last?.depthStatus ?? "off",
          pelvisStatus: last?.pelvisStatus ?? "good",
          caption: captionRef.current,
          reps: repsRef.current,
        });
      }
    }

    function drawFrame(
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      landmarks: NormalizedLandmark[] | null,
      frame: FrameAnalysis | null
    ) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!landmarks || landmarks.length === 0) return;

      renderSkeleton(ctx, canvas, landmarks, frame);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const busy = status !== "tracking" && status !== "calibrating";

  return (
    <div className="space-y-4 px-5 pt-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full -scale-x-100 object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full -scale-x-100"
        />

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/70 px-6 text-center">
            <p className="font-sans text-sm text-paper">
              {status === "idle" && "Starting camera…"}
              {status === "requesting" && "Requesting camera permission…"}
              {status === "loading-model" && "Loading pose model…"}
              {status === "error" &&
                (error ?? "Camera unavailable. Check permissions and try again.")}
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
          <h3 className="font-sans text-sm font-semibold text-ink">
            Heel Slides — live check
          </h3>
          <span className="font-mono text-2xl font-semibold text-pine">
            {ui.matchPct ?? "–"}
            <span className="text-sm text-ink/40">%</span>
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <CheckRow label="Slide depth" status={ui.depthStatus} />
          <CheckRow label="Pelvis contact" status={ui.pelvisStatus} />
        </div>

        <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink/50">
          <span>Knee angle</span>
          <span>{Math.round(ui.kneeAngleDeg)}°</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-xs text-ink/50">
          <span>Reps</span>
          <span>{ui.reps}</span>
        </div>

        <p
          className={`mt-3 rounded-xl px-3 py-2 font-sans text-sm ${
            ui.pelvisStatus !== "good"
              ? "bg-coral/10 text-coral"
              : ui.depthStatus === "good"
                ? "bg-moss/10 text-moss"
                : "bg-amber/10 text-amber"
          }`}
        >
          {ui.caption}
        </p>
      </div>
    </div>
  );
}

function CheckRow({ label, status }: { label: string; status: CheckStatus }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-sm text-ink/70">{label}</span>
      <span
        className={`flex items-center gap-1.5 font-sans text-xs font-medium ${TEXT_CLASS[status]}`}
      >
        <span className={`h-2 w-2 rounded-full ${DOT_CLASS[status]}`} />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  frame: FrameAnalysis | null
) {
  const w = canvas.width;
  const h = canvas.height;
  const toXY = (p: NormalizedLandmark) => ({ x: p.x * w, y: p.y * h });

  const neutral = "#F5F3EDaa";
  const indices = frame?.indices;

  // The thigh carries the depth check and the shin the same movement, while the
  // hip joint itself reports pelvic lift — so each is coloured by its own check
  // rather than the combined score.
  const thighColor = frame ? COLOR[frame.depthStatus] : neutral;
  const hipColor = frame ? COLOR[frame.pelvisStatus] : neutral;

  const connections: [number, number][] = [
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [23, 25],
    [25, 27],
    [24, 26],
    [26, 28],
    [27, 29],
    [29, 31],
    [28, 30],
    [30, 32],
  ];

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [a, b] of connections) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    const isActiveLeg =
      indices !== undefined &&
      (a === indices.hip || a === indices.knee || a === indices.ankle) &&
      (b === indices.hip || b === indices.knee || b === indices.ankle);
    ctx.strokeStyle = isActiveLeg ? thighColor : neutral;
    const { x: x1, y: y1 } = toXY(p1);
    const { x: x2, y: y2 } = toXY(p2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  landmarks.forEach((lm, i) => {
    const { x, y } = toXY(lm);
    let color = neutral;
    let radius = 5;
    if (indices) {
      if (i === indices.knee || i === indices.ankle) color = thighColor;
      if (i === indices.hip) {
        color = hipColor;
        radius = 7;
      }
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}
