// MoveNet reports a new reading only a few times a second, and its raw keypoints
// shimmer by a few pixels. The line-up gate calls a body "moving" above 0.2
// frames/second, so the shimmer matters. These check the two fixes: smoothing
// the keypoints (OneEuro) and judging stillness only once per new reading.
import { OneEuro } from '../src/components/coach/movenet.ts';
import { stepGate, initialGate } from '../src/components/coach/setupCheck.ts';

let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

// Deterministic noise.
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const std = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };

const HZ = 8, DT = 1 / HZ, SIGMA = 0.006;

// 1. A still body: the filter takes most of the shimmer out.
{
  const f = new OneEuro();
  const raw = [], out = [];
  for (let i = 0; i < 160; i++) {
    const v = 0.5 + gauss() * SIGMA;
    const y = f.filter(v, i * DT);
    if (i >= 20) { raw.push(v); out.push(y); }
  }
  const ratio = std(out) / std(raw);
  check(ratio < 0.55, `still body: shimmer cut to ${(ratio * 100).toFixed(0)}% of raw`);
}

// 2. A moving body: the filter keeps up (little lag).
{
  const f = new OneEuro();
  let err = 0, n = 0;
  for (let i = 0; i < 80; i++) {
    const truth = 0.2 + 0.4 * i * DT;          // 0.4 frames/second
    const y = f.filter(truth + gauss() * SIGMA, i * DT);
    if (i >= 30) { err += Math.abs(y - truth); n++; }
  }
  check(err / n < 0.03, `moving body: mean error ${(err / n).toFixed(3)} of the frame (limit 0.03)`);
}

// The setup check's view of a ready, upright body whose centre is (cx, cy).
const ready = (cx, cy) => ({ ready: true, hint: 'ready', checks: [], centre: { x: cx, y: cy } });

// Runs the gate for up to `seconds`; returns the time it said go, or null.
function run({ seconds, tickMs, readingEveryMs, smooth }) {
  const fx = new OneEuro(), fy = new OneEuro();
  let gate = initialGate, cx = 0.5, cy = 0.5, nextReading = 0, goAt = null;
  for (let t = 0; t <= seconds * 1000; t += tickMs) {
    if (t >= nextReading) {
      nextReading += readingEveryMs;
      const rx = 0.5 + gauss() * SIGMA, ry = 0.5 + gauss() * SIGMA;
      cx = smooth ? fx.filter(rx, t / 1000) : rx;
      cy = smooth ? fy.filter(ry, t / 1000) : ry;
    }
    const step = stepGate(gate, ready(cx, cy), t);
    gate = step.state;
    if (step.go) { goAt = t; break; }
  }
  return goAt;
}

// 3. The original failure: one cached reading judged on every 16 ms screen
//    tick, so each new reading's shimmer lands in a single tick as a jump.
{
  const goAt = run({ seconds: 40, tickMs: 16, readingEveryMs: 125, smooth: false });
  check(goAt === null, `old way (judge every screen tick, raw keypoints): never starts (${goAt === null ? 'stuck for 40s' : 'started at ' + goAt + 'ms'})`);
}

// 4. The fix: judge once per new reading, on smoothed keypoints.
{
  const goAt = run({ seconds: 40, tickMs: 125, readingEveryMs: 125, smooth: true });
  check(goAt !== null && goAt < 6000, `new way (once per reading, smoothed): starts after ${goAt}ms`);
}

// 5. Even without smoothing, judging once per reading is far less brittle.
{
  const goAt = run({ seconds: 40, tickMs: 125, readingEveryMs: 125, smooth: false });
  check(goAt !== null, `once per reading, raw keypoints: starts after ${goAt}ms`);
}

if (fail) { console.log(`${fail} failure(s)`); process.exit(1); }
console.log('all MoveNet smoothing and gate cases pass');
