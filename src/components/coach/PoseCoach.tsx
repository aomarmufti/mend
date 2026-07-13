"use client";

import { useEffect, useRef, useState } from "react";
import type {
  NormalizedLandmark,
  PoseLandmarker as PoseLandmarkerType,
} from "@mediapipe/tasks-vision";
import { LANDMARK, activeLeg, torsoLength } from "@/components/coach/poseMath";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Heuristic thresholds tuned by eye for the demo, not clinically validated.
const DEPTH_RATIO_THRESHOLD = 0.85; // ankle-to-hip horizontal dist / torso length
const HIP_RISE_THRESHOLD = 0.035; // normalized image units
const CALIBRATION_FRAMES = 30;

type Status = "idle" | "requesting" | "loading-model" | "tracking" | "error";

interface CheckState {
  depthGood: boolean;
  pelvisGood: boolean;
  kneeAngleDeg: number;
  matchPct: number;
  caption: string;
}

const initialChecks: CheckState = {
  depthGood: false,
  pelvisGood: true,
  kneeAngleDeg: 0,
  matchPct: 0,
  caption: "Lie down side-on to the camera to begin.",
};

export function PoseCoach() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  const hipBaselineRef = useRef<{ sum: number; count: number; value: number | null }>({
    sum: 0,
    count: 0,
    value: null,
  });

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<CheckState>(initialChecks);

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
      await video.play();

      setStatus("loading-model");
      try {
        const { FilesetResolver, PoseLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          "Couldn't load the pose model — check your internet connection."
        );
        setStatus("error");
        return;
      }

      setStatus("tracking");
      loop();
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;

      const process = () => {
        if (cancelled) return;
        if (video.readyState >= 2) {
          const result = landmarker.detectForVideo(video, performance.now());
          drawFrame(canvas, video, result.landmarks[0] ?? null);
        }
        rafRef.current = requestAnimationFrame(process);
      };
      rafRef.current = requestAnimationFrame(process);
    }

    function drawFrame(
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      landmarks: NormalizedLandmark[] | null
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!landmarks || landmarks.length === 0) {
        setChecks(initialChecks);
        return;
      }

      const leg = activeLeg(landmarks);
      const torso = torsoLength(landmarks);
      const depthRatio = leg.ankleHipHorizontalDist / torso;
      const depthGood = depthRatio < DEPTH_RATIO_THRESHOLD;

      const baseline = hipBaselineRef.current;
      if (baseline.count < CALIBRATION_FRAMES) {
        baseline.sum += leg.hip.y;
        baseline.count += 1;
        baseline.value = baseline.sum / baseline.count;
      }
      const hipRise =
        baseline.value !== null ? baseline.value - leg.hip.y : 0;
      const pelvisGood = hipRise <= HIP_RISE_THRESHOLD;

      const legColor = depthGood ? "#4B7A63" : "#D98A3A";
      const hipColor = pelvisGood ? legColor : "#BE4B3C";

      renderSkeleton(ctx, canvas, landmarks, {
        activeSide: leg.side,
        legColor,
        hipColor,
      });

      const depthScore = depthGood ? 100 : 40;
      const pelvisScore = pelvisGood ? 100 : 25;
      const matchPct = Math.round(depthScore * 0.6 + pelvisScore * 0.4);

      let caption: string;
      if (!pelvisGood) {
        caption =
          "Keep your lower back flat on the mat — you're arching to help the slide.";
      } else if (depthGood) {
        caption = "Nice depth — hold, then slide back with control.";
      } else {
        caption = "Slide your heel further toward you";
      }

      setChecks({
        depthGood,
        pelvisGood,
        kneeAngleDeg: leg.kneeAngleDeg,
        matchPct,
        caption,
      });
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

        {status !== "tracking" && (
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
            {checks.matchPct}
            <span className="text-sm text-ink/40">%</span>
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <CheckRow label="Slide depth" good={checks.depthGood} />
          <CheckRow label="Pelvis contact" good={checks.pelvisGood} />
        </div>

        <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink/50">
          <span>Knee angle</span>
          <span>{Math.round(checks.kneeAngleDeg)}°</span>
        </div>

        <p
          className={`mt-3 rounded-xl px-3 py-2 font-sans text-sm ${
            !checks.pelvisGood
              ? "bg-coral/10 text-coral"
              : checks.depthGood
                ? "bg-moss/10 text-moss"
                : "bg-amber/10 text-amber"
          }`}
        >
          {checks.caption}
        </p>
      </div>
    </div>
  );
}

function CheckRow({ label, good }: { label: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-sm text-ink/70">{label}</span>
      <span
        className={`flex items-center gap-1.5 font-sans text-xs font-medium ${
          good ? "text-moss" : "text-amber"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${good ? "bg-moss" : "bg-amber"}`}
        />
        {good ? "Good" : "Needs work"}
      </span>
    </div>
  );
}

function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  opts: { activeSide: "left" | "right"; legColor: string; hipColor: string }
) {
  const w = canvas.width;
  const h = canvas.height;
  const toXY = (p: NormalizedLandmark) => ({ x: p.x * w, y: p.y * h });

  const activeHip =
    opts.activeSide === "left" ? LANDMARK.leftHip : LANDMARK.rightHip;
  const activeKnee =
    opts.activeSide === "left" ? LANDMARK.leftKnee : LANDMARK.rightKnee;
  const activeAnkle =
    opts.activeSide === "left" ? LANDMARK.leftAnkle : LANDMARK.rightAnkle;

  const neutral = "#F5F3EDaa";

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
  for (const [a, b] of connections) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    const isActiveLeg =
      (a === activeHip || a === activeKnee || a === activeAnkle) &&
      (b === activeHip || b === activeKnee || b === activeAnkle);
    ctx.strokeStyle = isActiveLeg ? opts.legColor : neutral;
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
    if (i === activeKnee || i === activeAnkle) color = opts.legColor;
    if (i === activeHip) color = opts.hipColor;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, i === activeHip ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
  });
}
