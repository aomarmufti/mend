"use client";

import { isIOS } from "@/lib/device";

/**
 * Warms the browser (and the service worker cache) with the pose model while
 * someone reads an exercise page, so the coach starts faster when they tap it.
 * Skipped on Data Saver and slow connections. Desktop Safari uses MoveNet, so it
 * gets that model and its code; iPhones, iPads and every other browser get
 * MediaPipe's.
 */

const MEDIAPIPE_FILES = [
  "/mediapipe/models/pose_landmarker_lite.task",
  "/mediapipe/wasm/vision_wasm_internal.js",
  "/mediapipe/wasm/vision_wasm_internal.wasm",
];

const MOVENET_FILES = ["/models/movenet/movenet-lightning.json", "/models/movenet/movenet-lightning.bin"];

let started = false;

export function preloadPoseModel(): void {
  if (started || typeof window === "undefined") return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType))) return;
  // Desktop Safari: the coach uses MoveNet there. iPhones and iPads use MediaPipe.
  const webkit =
    /AppleWebKit/.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|Android)/.test(navigator.userAgent) && !isIOS();
  started = true;
  const run = () => {
    if (webkit) {
      for (const url of MOVENET_FILES) fetch(url).catch(() => {});
      import("@/components/coach/movenet").then((m) => m.warmMoveNet()).catch(() => {});
    } else {
      for (const url of MEDIAPIPE_FILES) fetch(url).catch(() => {});
    }
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(run);
  else setTimeout(run, 1500);
}
