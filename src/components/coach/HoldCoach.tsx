"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  NormalizedLandmark,
  PoseLandmarker as PoseLandmarkerType,
} from "@mediapipe/tasks-vision";
import { LANDMARK, type Point } from "@/components/coach/poseMath";
import {
  trackHold,
  initialHoldTracker,
  evaluateSignal,
  resolveInPosition,
  initialReadability,
  DEFAULT_HOLD_CONFIG,
  trackReps,
  initialRepTrackerState,
  DEFAULT_REP_CONFIG,
  type RepTrackerState,
  type RepConfig,
  type RepCue,
  type HoldTracker,
  type HoldCue,
  type HoldConfig,
  type HoldSignal,
  type ReadabilityTracker,
} from "@/components/coach/holdMath";
import {
  assessFraming,
  meanLuminance,
  type Framing,
  type FramingResult,
  type Posture,
} from "@/components/coach/framing";
import { ReferenceLoop, type ReferenceClip } from "@/components/coach/ReferenceLoop";
import { logExercise, type SetDetail } from "@/lib/exerciseLog";
import { readActiveConditionSlug } from "@/lib/activeCondition";
import { markCompletedToday } from "@/lib/localSession";
import { VOICE, stopSpeaking, tone } from "@/components/coach/coachVoice";
import { Pill, Ring, btnPrimary } from "@/components/ui/kit";

// Self-hosted so the coach works on a weak connection or none at all, and
// so starting a health activity does not hand a third-party CDN the user's IP.
const WASM_BASE_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/models/pose_landmarker_lite.task";

const CALIBRATION_FRAMES = 30;
const UI_INTERVAL_MS = 100;
/** How long the line-up checks must all pass before coaching starts. */
const LINEUP_HOLD_MS = 1_000;
/** After this long, offer to start without a perfect line-up. */
const LINEUP_ESCAPE_MS = 8_000;

export type { HoldSignal };

export interface HoldExerciseConfig {
  slug: string;
  name: string;
  signal: HoldSignal;
  targetReps: number;
  /**
   * "hold" reaches a position and stays there (a stretch); "reps" reaches it
   * and returns (a squat, a lunge). Both read the same signal — they differ
   * only in when a repetition is banked. Defaults to "hold".
   */
  mode?: "hold" | "reps";
  hold?: Partial<HoldConfig>;
  rep?: Partial<RepConfig>;
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

const REP_CUE_COPY: Record<RepCue, (remaining: number) => string | null> = {
  ready: () => null,
  descending: () => "Good, keep going.",
  holding: () => "That's the depth. Now come back.",
  counted: (remaining) => (remaining > 0 ? "Counted. Next one when you're ready." : "That's the set, nice work."),
  tooFast: () => "Not quite far enough. Go a little further.",
};

interface CueContext {
  targetSec: number;
  remaining: number;
  lastSetSec: number;
}

const CUE_COPY: Record<HoldCue, (c: CueContext) => string | null> = {
  seek: () => null,
  holding: () => null,
  nearly: () => "Nearly there, hold it.",
  banked: ({ targetSec, remaining }) =>
    remaining > 0
      ? `Good job, full ${targetSec} seconds. Release, then set up the next one.`
      : `Good job, full ${targetSec} seconds. That's the set done.`,
  // Counted, and honest about what was counted.
  "banked-partial": ({ lastSetSec, targetSec, remaining }) =>
    remaining > 0
      ? `Counted: ${lastSetSec}s of ${targetSec}s, a partial set. Next one when you're ready.`
      : `Counted: ${lastSetSec}s of ${targetSec}s, a partial set. That's the last one.`,
  "released-early": ({ targetSec }) =>
    `Too short to count. Aim for at least a few seconds, ideally the full ${targetSec}.`,
};

interface UiState {
  cue: HoldCue | RepCue;
  inPosition: boolean;
  elapsedSec: number;
  reps: number;
  partials: number;
  /** Correction while out of position, or the coaching line while in it. */
  message: string;
  tone: "good" | "warn" | "bad" | "neutral";
  framing: FramingResult | null;
  lineupMs: number;
}

export interface CoachResult {
  reps: number;
  partials: number;
  sets: SetDetail[];
  durationMs: number;
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
  /** Looping footage of the movement, shown in a corner while coaching. */
  reference?: ReferenceClip | null;
  framing?: Framing;
  posture?: Posture;
  /** The exercise's coaching cues; the first is shown while in position. */
  cues?: string[];
  /** Called with the result after it is logged. Without it, navigates to `exitHref`. */
  onFinish?: (result: CoachResult) => void;
  /** Leave without saving. */
  onExit?: () => void;
  exitHref?: string;
  /** Session progress, e.g. "2 of 3", shown in the header. */
  sessionLabel?: string;
}

type Status =
  | "idle"
  | "requesting"
  | "loading-model"
  | "lineup"
  | "calibrating"
  | "tracking"
  | "done"
  | "error";

/**
 * Full-screen camera coach: line up, then coach, then a summary.
 *
 * Screens 7 and 8 of the app flow. The tracking engine is the same one that
 * was already calibrated against footage (holdMath); this component adds the
 * line-up gate in front of it, scores form per rep rather than as a live
 * number, and owns the full-screen layout.
 */
export function HoldCoach({
  config,
  reference,
  framing = "side",
  posture = "standing",
  cues = [],
  onFinish,
  onExit,
  exitHref = "/plan",
  sessionLabel,
}: HoldCoachProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const statusRef = useRef<Status>("idle");

  const baselineRef = useRef<Baselines>(emptyBaselines);
  const calibFramesRef = useRef(0);
  const calibSumsRef = useRef({ hipY: { left: 0, right: 0 }, ankleY: { left: 0, right: 0 }, torso: 0 });

  const holdTrackerRef = useRef<HoldTracker>(initialHoldTracker);
  const repTrackerRef = useRef<RepTrackerState>(initialRepTrackerState);
  const readabilityRef = useRef<ReadabilityTracker>(initialReadability);
  const lastSideRef = useRef<"left" | "right" | null>(null);
  const repsRef = useRef(0);
  const partialsRef = useRef(0);
  const lastSetMsRef = useRef(0);
  const setsRef = useRef<SetDetail[]>([]);
  // Form is scored per rep: the mean match over the frames of one attempt,
  // reported once the attempt banks. A number that moves while you move is
  // noise to someone mid-stretch; a number per rep is feedback.
  const attemptRef = useRef({ sum: 0, n: 0 });
  const lastUiRef = useRef(0);
  const startedAtRef = useRef(0);
  const lumaRef = useRef<{ value: number | null; at: number }>({ value: null, at: 0 });
  const lumaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineupStartRef = useRef(0);
  const lineupOkSinceRef = useRef<number | null>(null);
  const forceStartRef = useRef(false);
  const spokenCueRef = useRef<HoldCue | RepCue | null>(null);
  const spokenCountRef = useRef<number | null>(null);
  const spokenUnreadableRef = useRef(false);
  const spokenLineupRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const voiceOnRef = useRef(true);

  const holdConfig: HoldConfig = { ...DEFAULT_HOLD_CONFIG, ...config.hold };
  const repConfig: RepConfig = { ...DEFAULT_REP_CONFIG, ...config.rep };
  const isReps = config.mode === "reps";
  const targetSec = Math.round(holdConfig.minHoldMs / 1000);
  const holdCue = cues[0] ?? "Hold the position.";

  const [status, setStatusState] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>({
    cue: "seek",
    inPosition: false,
    elapsedSec: 0,
    reps: 0,
    partials: 0,
    message: config.setupHint,
    tone: "neutral",
    framing: null,
    lineupMs: 0,
  });
  const [sets, setSets] = useState<SetDetail[]>([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [showRef, setShowRef] = useState(true);

  const setStatus = (s: Status) => {
    statusRef.current = s;
    setStatusState(s);
  };

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      setStatus("requesting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Camera permission was denied or no camera is available. You can still do this one with the timer.");
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
        setError("Couldn't load the pose model on this device.");
        setStatus("error");
        return;
      }

      lineupStartRef.current = performance.now();
      setStatus("lineup");
      if (voiceOnRef.current) VOICE.lineUp("Let's get you lined up.");
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

    function sampleLuminance(video: HTMLVideoElement, now: number) {
      if (now - lumaRef.current.at < 500) return;
      lumaRef.current.at = now;
      if (!lumaCanvasRef.current) lumaCanvasRef.current = document.createElement("canvas");
      const c = lumaCanvasRef.current;
      c.width = 32;
      c.height = 18;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      try {
        ctx.drawImage(video, 0, 0, 32, 18);
        lumaRef.current.value = meanLuminance(ctx.getImageData(0, 0, 32, 18).data);
      } catch {
        lumaRef.current.value = null;
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;
      if (video.readyState < 2 || !video.videoWidth) return;
      const phase = statusRef.current;
      if (phase === "done" || phase === "error") return;

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

      // ---- line up ---------------------------------------------------------
      if (phase === "lineup") {
        sampleLuminance(video, now);
        const result = assessFraming(landmarks, aspect, framing, posture, lumaRef.current.value);
        if (result.ready || forceStartRef.current) {
          lineupOkSinceRef.current ??= now;
        } else {
          lineupOkSinceRef.current = null;
        }
        if (
          forceStartRef.current ||
          (lineupOkSinceRef.current !== null && now - lineupOkSinceRef.current >= LINEUP_HOLD_MS)
        ) {
          if (voiceOnRef.current) VOICE.inPositionToStart();
          setStatus("calibrating");
        } else if (voiceOnRef.current && !result.ready) {
          // Repeat an instruction at most every 6s, and say a new one at once.
          const last = spokenLineupRef.current;
          if (last.text !== result.instruction ? now - last.at > 2500 : now - last.at > 6000) {
            spokenLineupRef.current = { text: result.instruction, at: now };
            VOICE.lineUp(result.instruction);
          }
        }
        drawFrame(canvas, video, landmarks, null, result.ready);
        if (now - lastUiRef.current > UI_INTERVAL_MS) {
          lastUiRef.current = now;
          setUi((u) => ({ ...u, framing: result, lineupMs: now - lineupStartRef.current }));
        }
        return;
      }

      // ---- calibrate resting position (only from lined-up frames) ----------
      const b = baselineRef.current;
      if (phase === "calibrating" && landmarks) {
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
            startedAtRef.current = Date.now();
            setStatus("tracking");
          }
        }
        drawFrame(canvas, video, landmarks, null, true);
        return;
      }
      if (phase !== "tracking") return;

      // A frame the model cannot read is not the same as a frame where the
      // user has let go; resolveInPosition carries the last state briefly.
      const reading = landmarks
        ? evaluateSignal(landmarks, aspect, config.signal, b.ankleY, b.torsoLength, b.hipY)
        : null;
      const resolved = resolveInPosition(readabilityRef.current, reading, now);
      readabilityRef.current = resolved.tracker;
      const inPosition = resolved.inPosition;
      if (reading && inPosition) {
        attemptRef.current.sum += reading.quality;
        attemptRef.current.n += 1;
      }
      if (reading) lastSideRef.current = reading.side;
      else if (!inPosition) lastSideRef.current = null;

      let result: { cue: HoldCue | RepCue; repBanked: boolean; elapsedMs: number; partial: boolean; bankedMs: number };
      if (isReps) {
        const r = trackReps(repTrackerRef.current, inPosition, now, repConfig);
        repTrackerRef.current = r.tracker;
        result = { cue: r.cue, repBanked: r.repBanked, elapsedMs: r.inZoneMs, partial: false, bankedMs: 0 };
      } else {
        const h = trackHold(holdTrackerRef.current, inPosition, now, holdConfig);
        holdTrackerRef.current = h.tracker;
        result = { cue: h.cue, repBanked: h.repBanked, elapsedMs: h.elapsedMs, partial: h.partial, bankedMs: h.bankedMs };
      }

      // ---- spoken feedback -------------------------------------------------
      if (voiceOnRef.current) {
        const previousCue = spokenCueRef.current;
        if (result.cue !== previousCue) {
          if (isReps) {
            if (result.cue === "holding") tone(660, 110);
            else if (result.cue === "tooFast") VOICE.notDeepEnough();
          } else if (result.cue === "holding" && previousCue !== "nearly") {
            VOICE.enteredPosition();
            spokenCountRef.current = null;
          } else if (result.cue === "released-early") {
            VOICE.releasedEarly();
            spokenCountRef.current = null;
          }
          spokenCueRef.current = result.cue;
        }
        if (!isReps && (result.cue === "holding" || result.cue === "nearly")) {
          const left = Math.ceil((holdConfig.minHoldMs - result.elapsedMs) / 1000);
          if (left > 0 && left <= 3 && spokenCountRef.current !== left) {
            spokenCountRef.current = left;
            VOICE.countdown(left);
          }
        }
        if (resolved.unreadable && !resolved.inPosition) {
          if (!spokenUnreadableRef.current) {
            spokenUnreadableRef.current = true;
            VOICE.unreadable();
          }
        } else {
          spokenUnreadableRef.current = false;
        }
      }

      if (result.repBanked) {
        repsRef.current += 1;
        if (result.partial) partialsRef.current += 1;
        lastSetMsRef.current = result.bankedMs;
        const a = attemptRef.current;
        const detail: SetDetail = {
          heldMs: isReps ? 0 : result.bankedMs,
          form: a.n ? Math.round(a.sum / a.n) : null,
          partial: result.partial || undefined,
        };
        setsRef.current = [...setsRef.current, detail];
        setSets(setsRef.current);
        attemptRef.current = { sum: 0, n: 0 };
        const remaining = Math.max(0, config.targetReps - repsRef.current);
        if (voiceOnRef.current) {
          if (isReps) VOICE.repCounted(repsRef.current, remaining);
          else if (result.partial)
            VOICE.partialSet(Math.round(result.bankedMs / 1000), targetSec, remaining);
          else VOICE.repBanked(repsRef.current, remaining);
        }
        spokenCountRef.current = null;
        if (remaining === 0) {
          // Give the final cue a moment on screen before the summary.
          window.setTimeout(() => {
            if (!cancelled && statusRef.current === "tracking") setStatus("done");
          }, 1800);
        }
      } else if (result.elapsedMs === 0 && !inPosition) {
        attemptRef.current = { sum: 0, n: 0 };
      }

      drawFrame(canvas, video, landmarks, lastSideRef.current, inPosition);

      if (now - lastUiRef.current > UI_INTERVAL_MS) {
        lastUiRef.current = now;
        const remaining = Math.max(0, config.targetReps - repsRef.current);
        const scripted = isReps
          ? REP_CUE_COPY[result.cue as RepCue](remaining)
          : CUE_COPY[result.cue as HoldCue]({
              targetSec,
              remaining,
              lastSetSec: Math.round(lastSetMsRef.current / 1000),
            });
        const unreadable = resolved.unreadable && !inPosition;
        const message = unreadable
          ? "Looking for you. Make sure your whole body is in frame."
          : (scripted ?? (inPosition ? holdCue : (reading?.hint ?? "Get into position to begin.")));
        const good = result.cue === "banked" || result.cue === "counted" || (inPosition && !scripted);
        const bad = result.cue === "released-early" || result.cue === "tooFast" || unreadable;
        setUi((u) => ({
          ...u,
          cue: result.cue,
          inPosition,
          elapsedSec: Math.floor(result.elapsedMs / 1000),
          reps: repsRef.current,
          partials: partialsRef.current,
          message,
          tone: good ? "good" : bad ? "bad" : inPosition ? "good" : "warn",
        }));
      }
    }

    function drawFrame(
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      landmarks: NormalizedLandmark[] | null,
      side: "left" | "right" | null,
      good: boolean,
    ) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!landmarks || landmarks.length === 0) return;
      renderSkeleton(ctx, canvas, landmarks, side, good);
    }

    start();

    return () => {
      cancelled = true;
      stopSpeaking();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // config is provided by the parent and not expected to change identity
    // mid-session; re-running this effect would tear down an active camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(() => {
    stopSpeaking();
    const details = setsRef.current;
    const scored = details.filter((d) => d.form !== null);
    const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    const bestHoldMs = Math.max(0, ...details.map((d) => d.heldMs));
    logExercise({
      conditionSlug: readActiveConditionSlug(),
      exerciseSlug: config.slug,
      exerciseName: config.name,
      reps: repsRef.current,
      sets: isReps ? 1 : repsRef.current,
      durationMs,
      avgScore: scored.length
        ? Math.round(scored.reduce((s, d) => s + (d.form ?? 0), 0) / scored.length)
        : null,
      partialReps: partialsRef.current || undefined,
      setDetails: details,
      bestHoldMs: bestHoldMs || undefined,
    });
    if (repsRef.current > 0) markCompletedToday();
    const result: CoachResult = { reps: repsRef.current, partials: partialsRef.current, sets: details, durationMs };
    if (onFinish) onFinish(result);
    else router.push(exitHref);
  }, [config.slug, config.name, isReps, onFinish, router, exitHref]);

  const exit = () => {
    stopSpeaking();
    if (onExit) onExit();
    else router.push(exitHref);
  };

  const unit = isReps ? "Rep" : "Set";
  const current = Math.min(ui.reps + 1, config.targetReps);
  const lastSet = sets[sets.length - 1];
  const lastSetLine = lastSet
    ? isReps
      ? `Rep ${sets.length}: form ${lastSet.form ?? "–"}`
      : `Set ${sets.length}: held ${Math.round(lastSet.heldMs / 1000)}s, form ${lastSet.form ?? "–"}`
    : isReps
      ? `${config.targetReps} reps`
      : `${config.targetReps} sets of ${targetSec}s`;
  const ringPct = isReps
    ? (ui.reps / Math.max(1, config.targetReps)) * 100
    : ui.cue === "banked"
      ? 100
      : (ui.elapsedSec / Math.max(1, targetSec)) * 100;
  const messageColor =
    ui.tone === "good" ? "text-success" : ui.tone === "bad" ? "text-coral" : ui.tone === "warn" ? "text-amber" : "text-ink";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-night text-white">
      <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-contain" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg,rgba(10,25,30,.6),rgba(10,25,30,0) 24%,rgba(10,25,30,0) 56%,rgba(10,25,30,.85))" }}
      />

      {status === "lineup" && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect
            x="8" y="12" width="84" height="66" rx="5" fill="none"
            stroke={ui.framing?.ready ? "#34D3A0" : "#fff"} strokeWidth="0.5" strokeDasharray="2.5 2" opacity="0.9"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 2 }}
          />
        </svg>
      )}

      <div className="relative mx-auto flex h-full max-w-md flex-col px-4 pt-[calc(0.9rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={exit} aria-label="Close the coach" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur">
            ×
          </button>
          <span className="min-w-0 flex-1 truncate font-sans text-sm font-extrabold">{config.name}</span>
          <Pill tone="glass">
            {status === "lineup" || status === "calibrating"
              ? "Line up"
              : status === "tracking"
                ? `${unit} ${current} of ${config.targetReps}`
                : sessionLabel ?? "Coach"}
          </Pill>
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              voiceOnRef.current = next;
              if (!next) stopSpeaking();
            }}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "Mute voice" : "Turn voice on"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm backdrop-blur"
          >
            {voiceOn ? "🔊" : "🔇"}
          </button>
        </div>

        {(status === "idle" || status === "requesting" || status === "loading-model") && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-mint" />
            <p className="mt-4 font-sans text-sm text-white/85">
              {status === "loading-model" ? "Loading the coach…" : "Asking for the camera…"}
            </p>
            <p className="mt-1 font-sans text-xs text-white/55">Everything runs on this phone. Nothing is uploaded.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="font-sans text-base font-bold">{error}</p>
            <button type="button" onClick={exit} className={`${btnPrimary} mt-6`}>
              Go back
            </button>
          </div>
        )}

        {(status === "lineup" || status === "calibrating") && (
          <>
            <div className="mx-auto mt-4 rounded-full bg-white px-4 py-2.5 font-sans text-sm font-extrabold text-ink shadow-[0_8px_24px_rgba(0,0,0,.25)]">
              {status === "calibrating" ? "Hold still…" : (ui.framing?.instruction ?? "Step into view")}
            </div>
            <div className="flex-1" />
            {ui.framing && (
              <div className="grid grid-cols-2 gap-1.5">
                {ui.framing.checks.map((c) => (
                  <Pill key={c.id} tone={c.ok ? "ok" : "warn"} className="justify-center py-1.5">
                    {c.ok ? "✓ " : ""}
                    {c.label}
                  </Pill>
                ))}
              </div>
            )}
            <p className="mt-2.5 text-center font-sans text-xs text-white/85">
              {status === "calibrating" ? "Finding your resting position" : config.setupHint}
            </p>
            {status === "lineup" && ui.lineupMs > LINEUP_ESCAPE_MS && (
              <button
                type="button"
                onClick={() => {
                  forceStartRef.current = true;
                }}
                className="mt-2 font-sans text-xs font-bold text-white underline underline-offset-4"
              >
                Start anyway
              </button>
            )}
          </>
        )}

        {status === "tracking" && (
          <>
            <div className="mt-3 flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Pill tone={ui.inPosition ? "ok" : "warn"} className="self-start">
                  {ui.inPosition ? "✓ In position" : "Get into position"}
                </Pill>
                {reference && showRef && (
                  <button type="button" onClick={() => setShowRef(false)} aria-label="Hide the reference clip" className="w-24">
                    <ReferenceLoop clip={{ ...reference, watchFor: undefined }} className="aspect-[3/4] w-24 rounded-xl" />
                  </button>
                )}
                {reference && !showRef && (
                  <button type="button" onClick={() => setShowRef(true)} className="self-start">
                    <Pill tone="glass">▶ Watch how</Pill>
                  </button>
                )}
              </div>
              <div className="rounded-full bg-white/92 p-0.5">
                <Ring pct={ringPct} size={78} color={ui.inPosition ? "#2FA67F" : "#D98A3A"}>
                  {isReps ? ui.reps : ui.cue === "banked" ? "✓" : `${ui.elapsedSec}s`}
                </Ring>
              </div>
            </div>
            <div className="flex-1" />
            <div className="rounded-[22px] bg-white/95 p-3.5 text-ink shadow-[0_8px_24px_rgba(0,0,0,.2)]">
              <p className={`font-sans text-sm font-extrabold ${messageColor}`} aria-live="polite">
                {ui.message}
              </p>
              <div className="mt-2 flex justify-between font-sans text-[11px] text-ink/55">
                <span>{lastSetLine}</span>
                <span>
                  {isReps
                    ? `${ui.reps} / ${config.targetReps}`
                    : ui.cue === "banked"
                      ? "Release"
                      : `Hold ${Math.min(ui.elapsedSec, targetSec)} / ${targetSec}s`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStatus("done")}
                className="mt-3 w-full rounded-full bg-chip py-2.5 font-sans text-xs font-bold text-ink/70"
              >
                {ui.reps > 0 ? "Finish" : "Stop"}
              </button>
            </div>
          </>
        )}

        {status === "done" && (
          <div className="flex flex-1 flex-col justify-end">
            <div className="rounded-[26px] bg-white p-5 text-ink">
              <p className="font-display text-2xl font-extrabold">
                {ui.reps >= config.targetReps ? "Nice work." : ui.reps > 0 ? "Here's what you did." : "Nothing counted yet."}
              </p>
              <p className="mt-1 font-sans text-sm text-ink/60">
                {ui.reps} of {config.targetReps} {isReps ? "reps" : "sets"}
                {ui.partials ? `, ${ui.partials} partial` : ""}.
              </p>
              {sets.length > 0 && (
                <ul className="mt-3 max-h-48 space-y-1.5 overflow-auto">
                  {sets.map((s, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-chip px-3 py-2 font-sans text-xs">
                      <span className="font-bold">
                        {unit} {i + 1}
                        {s.partial ? " · partial" : ""}
                      </span>
                      <span className="text-ink/60">
                        {!isReps && `held ${Math.round(s.heldMs / 1000)}s · `}form {s.form ?? "–"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={save} className={`${btnPrimary} mt-4`}>
                {onFinish ? "Save and continue" : "Save"}
              </button>
              {ui.reps < config.targetReps && (
                <button
                  type="button"
                  onClick={() => setStatus("tracking")}
                  className="mt-3 w-full font-sans text-xs font-bold text-ink/55"
                >
                  Keep going
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  side: "left" | "right" | null,
  good: boolean,
) {
  const w = canvas.width;
  const h = canvas.height;
  const toXY = (p: NormalizedLandmark) => ({ x: p.x * w, y: p.y * h });
  const line = "#34D3A0";
  const active = good ? "#34D3A0" : "#F2A93B";

  const indices: number[] =
    side === "left"
      ? [LANDMARK.leftHip, LANDMARK.leftKnee, LANDMARK.leftAnkle]
      : side === "right"
        ? [LANDMARK.rightHip, LANDMARK.rightKnee, LANDMARK.rightAnkle]
        : [];

  const connections: [number, number][] = [
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15], [12, 14], [14, 16],
    [23, 25], [25, 27], [24, 26], [26, 28],
    [27, 29], [29, 31], [28, 30], [30, 32],
  ];

  const scale = Math.max(1, w / 640);
  ctx.lineCap = "round";
  for (const [a, b] of connections) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2 || visibilityOf(p1) < 0.5 || visibilityOf(p2) < 0.5) continue;
    const isActive = indices.includes(a) && indices.includes(b);
    ctx.strokeStyle = isActive ? active : line;
    ctx.lineWidth = (isActive ? 5 : 3) * scale;
    const { x: x1, y: y1 } = toXY(p1);
    const { x: x2, y: y2 } = toXY(p2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  landmarks.forEach((lm, i) => {
    if (i < 11 || visibilityOf(lm) < 0.5) return;
    const { x, y } = toXY(lm);
    const isActive = indices.includes(i);
    ctx.beginPath();
    ctx.arc(x, y, (isActive ? 6 : 4) * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = isActive ? active : line;
    ctx.stroke();
  });
}
