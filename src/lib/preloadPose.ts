"use client";

/**
 * Warms the browser (and the service worker cache) with the pose model while
 * someone reads an exercise page, so the coach starts faster when they tap it.
 * Skipped on Data Saver and slow connections, and on WebKit, which uses a
 * different model path.
 */

const FILES = [
  "/mediapipe/models/pose_landmarker_lite.task",
  "/mediapipe/wasm/vision_wasm_internal.js",
  "/mediapipe/wasm/vision_wasm_internal.wasm",
];

let started = false;

export function preloadPoseModel(): void {
  if (started || typeof window === "undefined") return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType))) return;
  // Safari and every iPhone web view: the coach uses MoveNet there.
  const webkit = /AppleWebKit/.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|Android)/.test(navigator.userAgent);
  if (webkit) return;
  started = true;
  const run = () => {
    for (const url of FILES) fetch(url).catch(() => {});
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(run);
  else setTimeout(run, 1500);
}
