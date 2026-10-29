#!/usr/bin/env node
/**
 * Threshold calibration harness.
 *
 * Replays a video file through the *shipped* pose pipeline — the same
 * self-hosted WASM and model the app uses — and prints, frame by frame, every
 * quantity the coach's signals are built from. The point is to replace
 * guessed thresholds with measured ones: film the movement, run this, read the
 * numbers off the two states you care about (in position / out of position),
 * and pick a value with margin on both sides.
 *
 *   node scripts/calibrate.mjs path/to/clip.mp4
 *   node scripts/calibrate.mjs clip.mp4 --csv > clip.csv
 *   node scripts/calibrate.mjs clip.mp4 --from 2.5 --to 6.0
 *
 * Everything is served from one local origin so the browser treats the video,
 * the WASM and the model as same-origin — MediaPipe will not initialise from
 * a file:// page.
 *
 * Requires playwright (already a dev dependency of the test setup) and the
 * self-hosted assets in public/mediapipe.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, resolve, basename } from "node:path";
// Playwright is deliberately NOT a dependency of this project: it is only
// needed by this script, and adding it would have the deploy build download
// browsers on every push. Resolve it from wherever it happens to live.
const { chromium } = await (async () => {
  const { execSync } = await import("node:child_process");
  let globalRoot = "";
  try {
    globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  } catch {
    /* npm not on PATH — the bare specifiers below may still resolve */
  }
  const candidates = ["playwright", "playwright-core"];
  if (globalRoot) {
    const { pathToFileURL } = await import("node:url");
    candidates.push(
      pathToFileURL(`${globalRoot}/playwright/index.js`).href,
      pathToFileURL(`${globalRoot}/playwright-core/index.js`).href,
    );
  }
  for (const id of candidates) {
    try {
      const mod = await import(id);
      // Playwright is CommonJS: imported by file URL its named exports land
      // on `default` rather than on the namespace.
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      /* try the next one */
    }
  }
  console.error(
    "This script needs Playwright. Install it alongside the project:\n" +
      "  npm i -D playwright && npx playwright install chromium\n" +
      "(it is not a project dependency on purpose — see the comment above)",
  );
  process.exit(1);
})();

const args = process.argv.slice(2);
const videoPath = args.find((a) => !a.startsWith("--"));
const asCsv = args.includes("--csv");
const from = Number(args[args.indexOf("--from") + 1]) || 0;
const to = args.includes("--to") ? Number(args[args.indexOf("--to") + 1]) : Infinity;

if (!videoPath) {
  console.error("usage: node scripts/calibrate.mjs <video> [--csv] [--from s] [--to s]");
  process.exit(1);
}

const abs = resolve(videoPath);
await stat(abs).catch(() => {
  console.error(`cannot read ${abs}`);
  process.exit(1);
});

const MIME = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};

const HARNESS =
  `<!doctype html><html><body><video id="v" muted playsinline></video></body></html>`;

// The browser needs the tasks-vision ES module. Serve it straight out of
// node_modules so the harness runs the same library version the app ships.
const VISION_ENTRY = resolve("node_modules/@mediapipe/tasks-vision/vision_bundle.mjs");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(HARNESS);
    }
    if (url.pathname === "/vision.mjs") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(await readFile(VISION_ENTRY));
    }
    if (url.pathname === "/clip") {
      const { size } = await stat(abs);
      // Range support: Chromium will not seek reliably without it.
      const range = req.headers.range;
      const type = MIME[extname(abs).toLowerCase()] ?? "video/mp4";
      if (range) {
        const [s, e] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(s, 10);
        const end = e ? parseInt(e, 10) : size - 1;
        res.writeHead(206, {
          "content-range": `bytes ${start}-${end}/${size}`,
          "accept-ranges": "bytes",
          "content-length": end - start + 1,
          "content-type": type,
        });
        return createReadStream(abs, { start, end }).pipe(res);
      }
      res.writeHead(200, { "content-length": size, "content-type": type, "accept-ranges": "bytes" });
      return createReadStream(abs).pipe(res);
    }
    if (url.pathname.startsWith("/mediapipe/")) {
      const file = resolve("public" + url.pathname);
      res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
      return res.end(await readFile(file));
    }
    res.writeHead(404).end();
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.error("  [page]", m.text());
});
await page.goto(base);

const frames = await page.evaluate(
  async ({ base, from, to }) => {
    const { FilesetResolver, PoseLandmarker } = await import(`${base}/vision.mjs`);
    const vision = await FilesetResolver.forVisionTasks(`${base}/mediapipe/wasm`);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${base}/mediapipe/models/pose_landmarker_lite.task`,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    const v = document.getElementById("v");
    v.src = `${base}/clip`;
    await new Promise((res, rej) => {
      v.onloadedmetadata = res;
      v.onerror = () => rej(new Error("video failed to load"));
    });

    const L = {
      lSh: 11, rSh: 12, lHip: 23, rHip: 24,
      lKnee: 25, rKnee: 26, lAnk: 27, rAnk: 28,
    };
    const aspect = v.videoWidth / v.videoHeight;
    const vis = (p) => (typeof p?.visibility === "number" ? p.visibility : p ? 1 : 0);
    const c = (p) => ({ x: p.x * aspect, y: p.y });
    const ang = (a, b, d) => {
      const u = { x: a.x - b.x, y: a.y - b.y };
      const w = { x: d.x - b.x, y: d.y - b.y };
      const m1 = Math.hypot(u.x, u.y), m2 = Math.hypot(w.x, w.y);
      if (!m1 || !m2) return null;
      const cos = Math.min(1, Math.max(-1, (u.x * w.x + u.y * w.y) / (m1 * m2)));
      return (Math.acos(cos) * 180) / Math.PI;
    };

    const out = [];
    // Step through at a fixed 30fps rather than playing, so every frame is
    // sampled deterministically and the run is reproducible.
    const step = 1 / 30;
    for (let t = from; t < Math.min(to, v.duration); t += step) {
      v.currentTime = t;
      await new Promise((res) => (v.onseeked = res));
      const r = landmarker.detectForVideo(v, t * 1000);
      const lm = r.landmarks[0];
      if (!lm) { out.push({ t: +t.toFixed(3), seen: false }); continue; }

      const torsoA = c(lm[L.lSh]), torsoB = c(lm[L.lHip]);
      const torso = Math.hypot(torsoA.x - torsoB.x, torsoA.y - torsoB.y) || null;
      const leg = (sh, hip, knee, ank) => ({
        knee: ang(c(lm[hip]), c(lm[knee]), c(lm[ank])),
        hip: ang(c(lm[sh]), c(lm[hip]), c(lm[knee])),
        vis: Math.min(vis(lm[hip]), vis(lm[knee]), vis(lm[ank])),
      });
      const left = leg(L.lSh, L.lHip, L.lKnee, L.lAnk);
      const right = leg(L.rSh, L.rHip, L.rKnee, L.rAnk);

      const kneeMidY = (lm[L.lKnee].y + lm[L.rKnee].y) / 2;
      const hipMidY = (lm[L.lHip].y + lm[L.rHip].y) / 2;

      out.push({
        t: +t.toFixed(3),
        seen: true,
        torso: torso && +torso.toFixed(4),
        leftKnee: left.knee && +left.knee.toFixed(1),
        leftHip: left.hip && +left.hip.toFixed(1),
        leftVis: +left.vis.toFixed(2),
        rightKnee: right.knee && +right.knee.toFixed(1),
        rightHip: right.hip && +right.hip.toFixed(1),
        rightVis: +right.vis.toFixed(2),
        // Signal inputs, in the units the signals use.
        ankleGap: torso ? +(((lm[L.rAnk].y - lm[L.lAnk].y) / torso)).toFixed(3) : null,
        stanceSep: +(Math.abs(lm[L.lAnk].x - lm[L.rAnk].x) * aspect).toFixed(3),
        kneeHeight: torso ? +(((kneeMidY - hipMidY) / torso)).toFixed(3) : null,
        legSeparation: (() => {
          const a = ang(c(lm[L.lAnk]), c(lm[L.lHip]), c(lm[L.rAnk]));
          return a === null ? null : +a.toFixed(1);
        })(),
      });
    }
    landmarker.close();
    return out;
  },
  { base, from, to },
);

await browser.close();
server.close();

const seen = frames.filter((f) => f.seen);
if (asCsv) {
  const cols = Object.keys(seen[0] ?? { t: 0 });
  console.log(cols.join(","));
  for (const f of seen) console.log(cols.map((k) => f[k] ?? "").join(","));
} else {
  const stat_ = (key) => {
    const vals = seen.map((f) => f[key]).filter((v) => typeof v === "number").sort((a, b) => a - b);
    if (!vals.length) return "—";
    const q = (p) => vals[Math.floor((vals.length - 1) * p)];
    return `min ${vals[0]}  p10 ${q(0.1)}  median ${q(0.5)}  p90 ${q(0.9)}  max ${vals.at(-1)}`;
  };
  console.log(`\n${basename(abs)} — ${seen.length}/${frames.length} frames with a pose\n`);
  for (const k of [
    "leftKnee", "leftHip", "rightKnee", "rightHip",
    "ankleGap", "stanceSep", "kneeHeight", "legSeparation",
    "leftVis", "rightVis",
  ]) {
    console.log(`  ${k.padEnd(14)} ${stat_(k)}`);
  }
  console.log(
    "\nPick a threshold that sits clear of BOTH clusters — the in-position frames\n" +
      "and the setup frames. Re-run with --from/--to to isolate each phase, or\n" +
      "--csv to plot it.\n",
  );
}
