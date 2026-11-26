import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * A second body tracker, for browsers where MediaPipe's WebAssembly build
 * fails: Safari, and every iPhone and iPad web view (including a native app
 * that wraps this site), which all run WebKit.
 *
 * It runs Google's MoveNet through TensorFlow.js, which draws on the GPU
 * through WebGL rather than through a WebAssembly allocator, and returns the
 * same 33-slot landmark array the rest of the coach already reads. MoveNet has
 * 17 points, so only those slots are filled; the others read as not visible.
 * Nothing downstream uses the heel or toe slots for a decision.
 *
 * Accuracy comes from two passes. The first looks at the whole frame. If it
 * finds a person, later frames are cropped around where they were, so the
 * model input is spent on the body rather than on the room.
 */

/**
 * Thunder is the more accurate model (256 px input, ~12 MB); Lightning is the
 * lighter one (192 px, ~4.6 MB) for slow devices. Rehab angles depend on knees
 * and ankles being in the right place, so accuracy is the default.
 */
export type MoveNetVariant = "thunder" | "lightning";
const VARIANTS: Record<MoveNetVariant, { url: string; input: number }> = {
  thunder: { url: "/models/movenet/movenet-thunder.json", input: 256 },
  lightning: { url: "/models/movenet/movenet-lightning.json", input: 192 },
};

/** ?model=lightning picks the lighter model; anything else, the accurate one. */
export function chooseVariant(search: string): MoveNetVariant {
  return new URLSearchParams(search).get("model") === "lightning" ? "lightning" : "thunder";
}

/** MoveNet keypoint order -> MediaPipe pose landmark index. */
const TO_MEDIAPIPE = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** A keypoint at or above this score counts as seen. */
const SEEN = 0.3;
/** This many seen keypoints, at least, before we call it a person. */
const MIN_SEEN = 8;
/** Crop margin around the person, as a multiple of their larger dimension. */
const CROP_MARGIN = 1.35;

export interface MoveNetDetector {
  /** Which TensorFlow.js backend ended up in use: "webgl" or the "cpu" fallback. */
  backend: string;
  /** Landmarks for the person in this frame, or null when no one is there. */
  detect(frame: HTMLCanvasElement): Promise<NormalizedLandmark[] | null>;
  close(): void;
}

interface Crop {
  /** Top-left and side of a square, in frame pixels. It may run past the frame. */
  x: number;
  y: number;
  size: number;
}

/**
 * MoveNet's scores run lower than MediaPipe's visibility, and the coach's
 * "visible" threshold is tuned to MediaPipe's. Map a seen keypoint above that
 * threshold and an unseen one below it. A heuristic, not a calibration.
 */
function visibilityOf(score: number): number {
  return score >= SEEN ? Math.min(1, 0.55 + score * 0.45) : score * 1.5;
}

export async function createMoveNet(variant: MoveNetVariant = "thunder"): Promise<MoveNetDetector> {
  const { url: MODEL_URL, input: INPUT } = VARIANTS[variant];
  const tf = await import("@tensorflow/tfjs-core");
  await import("@tensorflow/tfjs-backend-webgl");
  await import("@tensorflow/tfjs-backend-cpu");
  const { loadGraphModel } = await import("@tensorflow/tfjs-converter");

  let backend = "webgl";
  try {
    await tf.setBackend("webgl");
  } catch {
    backend = "cpu";
  }
  if (tf.getBackend() !== backend) {
    // setBackend resolves false rather than throwing when the backend can't start.
    backend = "cpu";
    await tf.setBackend("cpu");
  }
  await tf.ready();

  const model = await loadGraphModel(MODEL_URL);

  const crop = document.createElement("canvas");
  crop.width = INPUT;
  crop.height = INPUT;
  const cropCtx = crop.getContext("2d", { willReadFrequently: false });
  if (!cropCtx) throw new Error("2D canvas is not available");

  let region: Crop | null = null;

  async function detect(frame: HTMLCanvasElement): Promise<NormalizedLandmark[] | null> {
    const w = frame.width;
    const h = frame.height;
    if (!w || !h) return null;

    // First pass: the whole frame as a square, padded. Later passes: the crop.
    const side = Math.max(w, h);
    const r: Crop = region ?? { x: (w - side) / 2, y: (h - side) / 2, size: side };

    // Everything that touches the frame happens before the first await, so the
    // caller can reuse the frame canvas as soon as this call returns a promise.
    cropCtx!.fillStyle = "#000";
    cropCtx!.fillRect(0, 0, INPUT, INPUT);
    // drawImage clips a source rectangle that runs past the image, and scales
    // the destination to match, so a crop hanging off the edge stays aligned.
    const sx = Math.max(0, r.x);
    const sy = Math.max(0, r.y);
    const ex = Math.min(w, r.x + r.size);
    const ey = Math.min(h, r.y + r.size);
    if (ex <= sx || ey <= sy) {
      region = null;
      return null;
    }
    const k = INPUT / r.size;
    cropCtx!.drawImage(frame, sx, sy, ex - sx, ey - sy, (sx - r.x) * k, (sy - r.y) * k, (ex - sx) * k, (ey - sy) * k);

    const input = tf.tidy(() => tf.expandDims(tf.browser.fromPixels(crop), 0));
    let raw: Float32Array | Int32Array | Uint8Array;
    try {
      const out = model.execute(input) as import("@tensorflow/tfjs-core").Tensor;
      raw = (await out.data()) as Float32Array;
      out.dispose();
    } finally {
      input.dispose();
    }

    // raw is [1, 1, 17, 3]: y, x, score per keypoint, normalised to the crop.
    const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      z: 0,
      visibility: 0,
    }));
    let seen = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 17; i++) {
      const ky = raw[i * 3];
      const kx = raw[i * 3 + 1];
      const score = raw[i * 3 + 2];
      const px = r.x + kx * r.size;
      const py = r.y + ky * r.size;
      landmarks[TO_MEDIAPIPE[i]] = { x: px / w, y: py / h, z: 0, visibility: visibilityOf(score) };
      if (score >= SEEN) {
        seen++;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      }
    }

    if (seen < MIN_SEEN) {
      // No one there, or lost them: look at the whole frame next time.
      region = null;
      return null;
    }

    // Track: crop a square around the person, with a margin, for the next frame.
    const size = Math.max(maxX - minX, maxY - minY) * CROP_MARGIN;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const safe = Math.max(size, Math.min(w, h) * 0.35);
    region = { x: cx - safe / 2, y: cy - safe / 2, size: safe };
    return landmarks;
  }

  return {
    backend,
    detect,
    close() {
      model.dispose();
    },
  };
}
