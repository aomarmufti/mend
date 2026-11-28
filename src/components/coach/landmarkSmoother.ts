/**
 * Temporal smoothing for the skeleton we DRAW.
 *
 * Raw pose landmarks jitter frame to frame, and jitter most exactly where a
 * user's own hand covers the limb (holding a foot for a quad stretch, for
 * example): the ankle/foot points get low confidence and the lower leg
 * visibly shakes. This is a One Euro filter per coordinate — heavy smoothing
 * while a point is still, light smoothing while it genuinely moves, so it
 * calms jitter without making the overlay lag behind the body — with the
 * cutoff lowered further for low-visibility landmarks.
 *
 * Rendering only. Scoring still reads the raw landmarks.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface SmootherOptions {
  /** Base cutoff in Hz. Lower = steadier when still. */
  minCutoff: number;
  /** Speed coefficient. Higher = less lag during real movement. */
  beta: number;
  /** Cutoff for the speed estimate itself, in Hz. */
  dCutoff: number;
  /** Gap after which tracking is considered lost and the filter restarts. */
  resetAfterMs: number;
}

export const DEFAULT_SMOOTHER: SmootherOptions = {
  minCutoff: 1.2,
  beta: 6,
  dCutoff: 1.0,
  resetAfterMs: 500,
};

const alpha = (cutoffHz: number, dtSec: number) => {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
};

interface Axis {
  x: number;
  dx: number;
}

export class LandmarkSmoother {
  private axes: Axis[] = [];
  private lastT = -Infinity;

  constructor(private readonly opts: SmootherOptions = DEFAULT_SMOOTHER) {}

  reset() {
    this.axes = [];
    this.lastT = -Infinity;
  }

  smooth(landmarks: NormalizedLandmark[], tMs: number): NormalizedLandmark[] {
    const gap = tMs - this.lastT;
    if (gap > this.opts.resetAfterMs || this.axes.length !== landmarks.length * 3) {
      this.axes = landmarks.flatMap((p) => [
        { x: p.x, dx: 0 },
        { x: p.y, dx: 0 },
        { x: p.z, dx: 0 },
      ]);
      this.lastT = tMs;
      return landmarks;
    }
    // Repeated calls on the same instant (a redraw of a stale detection) must
    // not re-filter and drift.
    const dt = Math.max(gap, 0) / 1000;
    if (dt <= 0.001) return this.snapshot(landmarks);
    this.lastT = tMs;

    return landmarks.map((p, i) => {
      const vis = typeof p.visibility === "number" ? p.visibility : 1;
      // Low confidence -> trust the new sample less: down to ~35% of the
      // base cutoff, so a covered foot is held steady rather than chased.
      const conf = 0.35 + 0.65 * Math.min(1, Math.max(0, vis));
      const cutoffBase = this.opts.minCutoff * conf;
      const next = [p.x, p.y, p.z];
      const out = next.map((v, k) => {
        const a = this.axes[i * 3 + k];
        const rawD = (v - a.x) / dt;
        const dHat = a.dx + alpha(this.opts.dCutoff, dt) * (rawD - a.dx);
        const cutoff = cutoffBase + this.opts.beta * Math.abs(dHat);
        const xHat = a.x + alpha(cutoff, dt) * (v - a.x);
        a.x = xHat;
        a.dx = dHat;
        return xHat;
      });
      return { ...p, x: out[0], y: out[1], z: out[2] };
    });
  }

  private snapshot(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
    return landmarks.map((p, i) => ({
      ...p,
      x: this.axes[i * 3].x,
      y: this.axes[i * 3 + 1].x,
      z: this.axes[i * 3 + 2].x,
    }));
  }
}
