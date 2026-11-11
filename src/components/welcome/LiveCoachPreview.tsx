"use client";

import { useEffect, useRef } from "react";

/**
 * The calf-stretch reference clip with the coach's skeleton drawn over it.
 *
 * The joints are not animated by hand: `standing-calf-stretch.landmarks.json`
 * is the app's own pose model run over this exact clip, sampled at 15 fps,
 * so frame N of the video is drawn with the landmarks of frame N. The canvas
 * repeats the video's object-fit: cover and object-position maths, which is
 * what keeps the joints on the body at any screen size.
 */

interface LandmarkTrack {
  w: number;
  h: number;
  fps: number;
  idx: number[];
  /** Per frame, per tracked index: [x, y, visibility], normalised 0-1. */
  f: [number, number, number][][];
}

const LINES: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32],
];

export function LiveCoachPreview({
  src = "/reference/standing-calf-stretch.mp4",
  poster = "/reference/standing-calf-stretch.jpg",
  track = "/reference/standing-calf-stretch.landmarks.json",
  objectPosition = [0.5, 0.82],
  className = "",
}: {
  src?: string;
  poster?: string;
  track?: string;
  objectPosition?: [number, number];
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [px, py] = objectPosition;

  useEffect(() => {
    const box = boxRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!box || !video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let data: LandmarkTrack | null = null;
    let cancelled = false;
    let handle: number | null = null;

    fetch(track)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LandmarkTrack | null) => {
        if (!cancelled) data = d;
      })
      .catch(() => {});

    const paint = (t: number) => {
      const r = box.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const bw = r.width;
      const bh = r.height;
      if (canvas.width !== Math.round(bw * dpr) || canvas.height !== Math.round(bh * dpr)) {
        canvas.width = Math.round(bw * dpr);
        canvas.height = Math.round(bh * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
      if (!data) return;
      const s = Math.max(bw / data.w, bh / data.h);
      const ox = (bw - data.w * s) * px;
      const oy = (bh - data.h * s) * py;
      const i = Math.max(0, Math.min(data.f.length - 1, Math.round(t * data.fps)));
      const frame = data.f[i];
      if (!frame) return;
      const pos = new Map(data.idx.map((k, j) => [k, j]));
      const P = (k: number): [number, number] | null => {
        const j = pos.get(k);
        if (j === undefined) return null;
        const q = frame[j];
        return q[2] < 0.5 ? null : [q[0] * data!.w * s + ox, q[1] * data!.h * s + oy];
      };
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#34D3A0";
      for (const [a, b] of LINES) {
        const pa = P(a);
        const pb = P(b);
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
      }
      for (const k of data.idx) {
        const p = P(k);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3.6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#34D3A0";
        ctx.stroke();
      }
    };

    type FrameVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };
    const v = video as FrameVideo;
    const tick = (_now?: number, meta?: { mediaTime: number }) => {
      if (cancelled) return;
      paint(meta?.mediaTime ?? v.currentTime);
      handle = v.requestVideoFrameCallback
        ? v.requestVideoFrameCallback(tick)
        : requestAnimationFrame(() => tick());
    };
    tick();
    void v.play().catch(() => {});
    const onResize = () => paint(v.currentTime);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (handle !== null) {
        if (v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
        cancelAnimationFrame(handle);
      }
    };
  }, [track, px, py]);

  return (
    <div ref={boxRef} className={`relative overflow-hidden bg-night ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: `${px * 100}% ${py * 100}%` }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
