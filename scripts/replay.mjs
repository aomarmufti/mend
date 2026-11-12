#!/usr/bin/env node
/**
 * Replay a clip through the *shipped* coach logic and report why it behaves
 * the way it does.
 *
 * calibrate.mjs answers "what are the numbers". This answers the question that
 * actually matters when a user says a check is not working: across a real
 * attempt, how often does the coach think they are in position, how often can
 * it not see them at all, and where exactly does a hold break?
 *
 * Landmarks are extracted in a browser (the only place MediaPipe runs), then
 * fed frame by frame through the real `evaluateSignal`, `resolveInPosition`
 * and `trackHold` — the same functions the app runs — at real frame
 * timestamps, so grace windows and hold timers behave as they do live.
 *
 *   node scripts/replay.mjs clip.mp4 standing-calf-stretch
 *   node scripts/replay.mjs clip.mp4 standing-calf-stretch --from 1.2 --to 7.8
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, resolve, basename } from "node:path";

const { chromium } = await (async () => {
  const { execSync } = await import("node:child_process");
  let globalRoot = "";
  try {
    globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  } catch {
    /* npm not on PATH */
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
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      /* next */
    }
  }
  console.error("This script needs Playwright: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
})();

const { mobilityExercises } = await import("../src/data/mobilityExercises.ts");
const { coachedExercises } = await import("../src/data/coachedExercises.ts");
const {
  evaluateSignal,
  resolveInPosition,
  initialReadability,
  trackHold,
  initialHoldTracker,
  DEFAULT_HOLD_CONFIG,
} = await import("../src/components/coach/holdMath.ts");

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const videoPath = positional[0];
const slug = positional[1];
const from = Number(args[args.indexOf("--from") + 1]) || 0;
const to = args.includes("--to") ? Number(args[args.indexOf("--to") + 1]) : Infinity;
// Shrinks the figure toward the centre of the frame, which is what standing
// further from the camera does. Nothing about the movement changes, so a
// check that is measured against the body should read the clip identically at
// any scale; one measured against the frame will not.
const scale = args.includes("--scale") ? Number(args[args.indexOf("--scale") + 1]) : 1;

if (!videoPath || !slug) {
  console.error("usage: node scripts/replay.mjs <video> <exercise-slug> [--from s] [--to s]");
  process.exit(1);
}

const mobility = mobilityExercises.find((e) => e.slug === slug);
const config = mobility?.hold ?? coachedExercises[slug]?.config;
if (!config) {
  console.error(`no coached exercise with slug "${slug}"`);
  process.exit(1);
}
const holdConfig = { ...DEFAULT_HOLD_CONFIG, ...config.hold };

const abs = resolve(videoPath);
await stat(abs).catch(() => {
  console.error(`cannot read ${abs}`);
  process.exit(1);
});

const MIME = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".js": "text/javascript", ".wasm": "application/wasm", ".task": "application/octet-stream" };
const VISION_ENTRY = resolve("node_modules/@mediapipe/tasks-vision/vision_bundle.mjs");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><html><body><video id="v" muted playsinline></video></body></html>`);
    }
    if (url.pathname === "/vision.mjs") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(await readFile(VISION_ENTRY));
    }
    if (url.pathname === "/clip") {
      const { size } = await stat(abs);
      const type = MIME[extname(abs).toLowerCase()] ?? "video/mp4";
      const range = req.headers.range;
      if (range) {
        const [s, e] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(s, 10);
        const end = e ? parseInt(e, 10) : size - 1;
        res.writeHead(206, { "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1, "content-type": type });
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
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base);

const frames = await page.evaluate(
  async ({ base, from, to }) => {
    const { FilesetResolver, PoseLandmarker } = await import(`${base}/vision.mjs`);
    const vision = await FilesetResolver.forVisionTasks(`${base}/mediapipe/wasm`);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `${base}/mediapipe/models/pose_landmarker_lite.task`, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    const v = document.getElementById("v");
    v.src = `${base}/clip`;
    await new Promise((res, rej) => {
      v.onloadedmetadata = res;
      v.onerror = () => rej(new Error("video failed to load"));
    });
    const aspect = v.videoWidth / v.videoHeight;
    const out = [];
    const step = 1 / 30;
    for (let t = from; t < Math.min(to, v.duration); t += step) {
      v.currentTime = t;
      await new Promise((res) => (v.onseeked = res));
      const r = landmarker.detectForVideo(v, t * 1000);
      const lm = r.landmarks[0];
      out.push({
        t,
        aspect,
        // Only the fields the signal functions read, so the payload stays small.
        lm: lm ? lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) : null,
      });
    }
    landmarker.close();
    return out;
  },
  { base, from, to },
);

await browser.close();
server.close();

// ---- replay through the real logic -----------------------------------------
let readability = initialReadability;
let hold = initialHoldTracker;
let readable = 0,
  inPos = 0,
  unreadable = 0;
let sets = 0,
  partials = 0;
const breaks = [];
const strip = [];

// splitStance and friends need a torso length and ankle baselines; the live
// coach calibrates these over its first 30 frames, so do the same here.
const torsoOf = (lm, aspect) => {
  const sh = lm[11] ?? lm[12];
  const hip = lm[23] ?? lm[24];
  if (!sh || !hip) return null;
  return Math.hypot(sh.x * aspect - hip.x * aspect, sh.y - hip.y) || null;
};
let torsoSum = 0,
  torsoN = 0;
for (const f of frames.slice(0, 30)) {
  if (!f.lm) continue;
  const tl = torsoOf(f.lm, f.aspect);
  if (tl) {
    torsoSum += tl;
    torsoN += 1;
  }
}
const torso = torsoN ? (torsoSum / torsoN) * scale : null;
const baselines = { left: null, right: null };

if (scale !== 1) {
  for (const f of frames) {
    if (!f.lm) continue;
    f.lm = f.lm.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * scale, y: 0.5 + (p.y - 0.5) * scale }));
  }
  console.log(`  (figure scaled to ${Math.round(scale * 100)}% — as if standing further from the camera)`);
}

for (const f of frames) {
  const nowMs = f.t * 1000;
  const reading = f.lm ? evaluateSignal(f.lm, f.aspect, config.signal, baselines, torso) : null;
  if (reading) {
    readable += 1;
    if (reading.inPosition) inPos += 1;
  } else {
    unreadable += 1;
  }
  const resolved = resolveInPosition(readability, reading, nowMs);
  readability = resolved.tracker;

  const before = hold.phase;
  const r = trackHold(hold, resolved.inPosition, nowMs, holdConfig);
  hold = r.tracker;
  if (r.repBanked) {
    sets += 1;
    if (r.partial) partials += 1;
  }
  if (before !== "seeking" && hold.phase === "seeking" && !r.repBanked) {
    breaks.push({ at: f.t.toFixed(2), reason: reading === null ? "could not see the body" : "left the position" });
  }
  strip.push(reading === null ? "?" : resolved.inPosition ? "#" : ".");
}

const pct = (n) => `${Math.round((n / frames.length) * 100)}%`;
console.log(`\n${basename(abs)} → ${config.name}  (${frames.length} frames)\n`);
console.log(`  readable           ${pct(readable)}   (${readable})`);
console.log(`  unreadable         ${pct(unreadable)}   (${unreadable})  ← a run of these >1s drops the hold`);
console.log(`  judged in position ${pct(inPos)}   (${inPos} of ${readable} readable)`);
console.log(`\n  sets banked        ${sets}  (${partials} partial)`);
if (breaks.length) {
  console.log(`  holds broken       ${breaks.length}`);
  for (const b of breaks.slice(0, 12)) console.log(`    t=${b.at}s  ${b.reason}`);
} else {
  console.log(`  holds broken       none`);
}
// Where in the clip, not just how much of it: a run of dots in the middle of a
// hold is a different bug from dots at the front while the user gets set up.
console.log(`\n  timeline  # in position   . out of position   ? cannot see\n`);
const WIDTH = 72;
for (let i = 0; i < strip.length; i += WIDTH) {
  const chunk = strip.slice(i, i + WIDTH);
  const at = (frames[i]?.t ?? 0).toFixed(1).padStart(5);
  console.log(`  ${at}s  ${chunk.join("")}`);
}

console.log(
  `\n  A clip of someone doing the exercise correctly should read close to 100%\n` +
    `  in position with no broken holds. Anything less is the check being wrong,\n` +
    `  not the user.\n`,
);
