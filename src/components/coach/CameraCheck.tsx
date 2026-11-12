"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseLandmarker as PoseLandmarkerType } from "@mediapipe/tasks-vision";
import { meanLuminance } from "@/components/coach/setupCheck";
import { btnPrimary } from "@/components/ui/kit";

/**
 * Camera self-test. Runs the pose model every way the coach could run it
 * (GPU or CPU, reading the <video> or a 2D canvas copy) and reports what
 * each one finds, plus the exact frame the model was given. When the coach
 * can't see someone, this says which link is broken on their device, as
 * text they can copy, rather than a photo of a screen.
 */

const WASM_BASE_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/models/pose_landmarker_lite.task";
const RUN_MS = 3000;

type Delegate = "GPU" | "CPU";
type Source = "video" | "canvas";

interface Run {
  label: string;
  frames: number;
  found: number;
  errors: number;
  firstError: string | null;
  loadError: string | null;
}

function short(err: unknown): string {
  const s = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return s.slice(0, 160);
}

export function CameraCheck() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [status, setStatus] = useState("Asking for the camera…");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const info: string[] = [];
    const log = (l: string) => {
      info.push(l);
      if (!cancelled) setLines([...info]);
    };

    async function main() {
      log(`Browser: ${navigator.userAgent}`);
      log(`Screen: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`);
      const gl = document.createElement("canvas").getContext("webgl2");
      log(`WebGL2: ${gl ? "yes" : "no"}`);
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) log(`GPU: ${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`);
      }
      log(`crossOriginIsolated: ${self.crossOriginIsolated}`);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        log(`Camera: FAILED ${short(err)}`);
        setStatus("No camera access.");
        setDone(true);
        return;
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      try {
        await video.play();
        log("video.play(): ok");
      } catch (err) {
        log(`video.play(): FAILED ${short(err)}`);
      }
      const t0 = performance.now();
      while (!video.videoWidth && performance.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 50));
      const track = stream.getVideoTracks()[0];
      log(`Camera: ${track?.label || "unnamed"} · ${video.videoWidth}×${video.videoHeight} · readyState ${video.readyState}`);

      // Is the picture real? A canvas copy that is all black means the
      // browser hands JavaScript an empty frame.
      const snap = snapRef.current!;
      const sw = Math.min(640, video.videoWidth || 640);
      const sh = Math.round((sw * (video.videoHeight || 360)) / (video.videoWidth || 640));
      snap.width = sw;
      snap.height = sh;
      const sctx = snap.getContext("2d", { willReadFrequently: true })!;
      const ct0 = video.currentTime;
      await new Promise((r) => setTimeout(r, 500));
      log(`video.currentTime advancing: ${video.currentTime !== ct0 ? "yes" : "NO"} (${ct0.toFixed(2)} → ${video.currentTime.toFixed(2)})`);
      sctx.drawImage(video, 0, 0, sw, sh);
      try {
        const data = sctx.getImageData(0, 0, sw, sh).data;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] < 15) dark++;
        log(`Canvas frame: brightness ${meanLuminance(data).toFixed(2)} · ${Math.round((dark / (data.length / 4)) * 100)}% black pixels`);
      } catch (err) {
        log(`Canvas frame: getImageData FAILED ${short(err)}`);
      }

      setStatus("Loading the pose model…");
      let vision: Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>;
      let PoseLandmarker: typeof import("@mediapipe/tasks-vision").PoseLandmarker;
      try {
        const mod = await import("@mediapipe/tasks-vision");
        PoseLandmarker = mod.PoseLandmarker;
        vision = await mod.FilesetResolver.forVisionTasks(WASM_BASE_URL);
        log("Model runtime (WASM): loaded");
      } catch (err) {
        log(`Model runtime (WASM): FAILED ${short(err)}`);
        setStatus("The pose model could not load.");
        setDone(true);
        return;
      }

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = sw;
      frameCanvas.height = sh;
      const fctx = frameCanvas.getContext("2d")!;
      const results: Run[] = [];
      let lastPose: { x: number; y: number }[] | null = null;

      for (const [delegate, source] of [
        ["GPU", "video"],
        ["GPU", "canvas"],
        ["CPU", "video"],
        ["CPU", "canvas"],
      ] as [Delegate, Source][]) {
        if (cancelled) return;
        const run: Run = { label: `${delegate} + ${source}`, frames: 0, found: 0, errors: 0, firstError: null, loadError: null };
        setStatus(`Testing ${run.label}… stand where the whole of you is visible`);
        let lm: PoseLandmarkerType | null = null;
        try {
          lm = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch (err) {
          run.loadError = short(err);
        }
        if (lm) {
          const end = performance.now() + RUN_MS;
          while (performance.now() < end && !cancelled) {
            await new Promise((r) => requestAnimationFrame(r));
            run.frames++;
            try {
              let input: HTMLVideoElement | HTMLCanvasElement = video;
              if (source === "canvas") {
                fctx.drawImage(video, 0, 0, sw, sh);
                input = frameCanvas;
              }
              const r = lm.detectForVideo(input, performance.now());
              if (r.landmarks[0]) {
                run.found++;
                lastPose = r.landmarks[0];
              }
            } catch (err) {
              run.errors++;
              run.firstError ??= short(err);
            }
          }
          lm.close();
        }
        results.push(run);
        if (!cancelled) setRuns([...results]);
      }

      // Show exactly what the model was given, with what it found.
      sctx.drawImage(video, 0, 0, sw, sh);
      if (lastPose) {
        sctx.fillStyle = "#34D3A0";
        for (const p of lastPose) {
          sctx.beginPath();
          sctx.arc(p.x * sw, p.y * sh, 4, 0, Math.PI * 2);
          sctx.fill();
        }
      }
      const anyFound = results.some((r) => r.found > 0);
      setStatus(anyFound ? "The model can see you on this device." : "The model found no one in any mode.");
      setDone(true);
    }

    main();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const report = [
    ...lines,
    ...runs.map(
      (r) =>
        `${r.label}: ${r.loadError ? `LOAD FAILED ${r.loadError}` : `frames ${r.frames} · found ${r.found} · errors ${r.errors}${r.firstError ? ` · first error: ${r.firstError}` : ""}`}`,
    ),
  ].join("\n");

  return (
    <div className="min-h-[100dvh] bg-night px-5 py-6 text-white">
      <h1 className="font-display text-2xl font-extrabold">Camera check</h1>
      <p className="mt-1 font-sans text-sm text-white/75">{status}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-sans text-xs text-white/60">Camera</p>
          <video ref={videoRef} muted playsInline className="w-full -scale-x-100 rounded-xl bg-black" />
        </div>
        <div>
          <p className="mb-1 font-sans text-xs text-white/60">What the model received{done ? " (green dots: what it found)" : ""}</p>
          <canvas ref={snapRef} className="w-full rounded-xl bg-black" />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {runs.map((r) => (
          <li key={r.label} className="flex justify-between rounded-xl bg-white/10 px-3 py-2 font-sans text-sm">
            <span className="font-bold">{r.label}</span>
            <span className={r.found > 0 ? "text-mint" : "text-amber"}>
              {r.loadError ? "failed to load" : `found you in ${r.found} of ${r.frames} frames${r.errors ? `, ${r.errors} errors` : ""}`}
            </span>
          </li>
        ))}
      </ul>

      <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/80">
        {report}
      </pre>

      <button
        type="button"
        disabled={!done}
        onClick={() => {
          navigator.clipboard.writeText(report).then(() => setCopied(true), () => setCopied(false));
        }}
        className={`${btnPrimary} mt-4`}
      >
        {copied ? "Copied. Paste it to the team." : done ? "Copy report" : "Testing…"}
      </button>
    </div>
  );
}
