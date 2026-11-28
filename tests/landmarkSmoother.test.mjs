// The drawn skeleton must be calm when a point is jittering in place (a hand
// covering a foot) yet still follow a real movement. Run with: npm test
import { LandmarkSmoother } from '../src/components/coach/landmarkSmoother.ts';
import assert from 'node:assert/strict';
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
const lm = (x, y, v) => [{ x, y, z: 0, visibility: v }];
const range = a => Math.max(...a) - Math.min(...a);

// 1. Still point, low visibility, ±1.5% jitter at 30fps -> drawn spread much smaller.
let s = new LandmarkSmoother(), raw = [], out = [];
for (let i = 0; i < 90; i++) { const x = 0.5 + rnd() * 0.03; raw.push(x); out.push(s.smooth(lm(x, 0.5, 0.4), i * 33)[0].x); }
assert.ok(range(out.slice(30)) < range(raw.slice(30)) * 0.4, `jitter not reduced: ${range(out.slice(30))} vs ${range(raw.slice(30))}`);

// 2. Real movement (0.3 over 1s) is followed with little lag.
s = new LandmarkSmoother(); let last = 0;
for (let i = 0; i < 60; i++) last = s.smooth(lm(0.3 + 0.3 * (i / 30 > 1 ? 1 : i / 30), 0.5, 0.95), i * 33)[0].x;
assert.ok(Math.abs(last - 0.6) < 0.03, `lagging: ${last}`);

// 3. After tracking is lost the filter restarts instead of gliding from a stale pose.
s = new LandmarkSmoother(); s.smooth(lm(0.1, 0.1, 1), 0); s.smooth(lm(0.1, 0.1, 1), 33);
assert.equal(s.smooth(lm(0.9, 0.9, 1), 5000)[0].x, 0.9);
console.log('landmarkSmoother: ok');
