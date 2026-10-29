// The live "Form %" the coach shows is `SignalReading.quality`. These feed
// synthetic landmarks through the real `evaluateSignal` and check the number
// means something: high when the position is right, low when it is wrong, and
// moving in between rather than snapping between two values.
import { evaluateSignal } from '../src/components/coach/holdMath.ts';

const I = { lSh:11, rSh:12, lHip:23, rHip:24, lKnee:25, rKnee:26, lAnk:27, rAnk:28 };
function pose(pts) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  for (const [i, [x, y]] of Object.entries(pts)) lm[i] = { x, y, z: 0, visibility: 0.99 };
  return lm;
}
// Side-on standing figure. Both legs share a hip; the ankle x positions set
// the stance width and the knee positions set how straight each leg is.
function standing({ backAnkleX, frontAnkleX, backKneeX, frontKneeX }) {
  return pose({
    [I.lSh]: [0.5, 0.20], [I.rSh]: [0.5, 0.20],
    [I.lHip]: [0.5, 0.50], [I.rHip]: [0.5, 0.50],
    [I.rKnee]: [backKneeX, 0.72], [I.rAnk]: [backAnkleX, 0.94],
    [I.lKnee]: [frontKneeX, 0.72], [I.lAnk]: [frontAnkleX, 0.95],
  });
}

// Moves the whole figure toward the frame's centre, which is exactly what
// standing further from the camera does to the landmarks. Torso length shrinks
// with it, so anything measured as a fraction of the body is unchanged and
// anything measured as a fraction of the frame is not.
const TORSO = 0.3;
function stepBack(lm, factor) {
  return lm.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * factor, y: 0.5 + (p.y - 0.5) * factor }));
}

// The shipped calf-stretch config, thresholds and all.
const CALF = { kind: 'splitStance', backKneeMin: 165, minSeparation: 0.55 };
const read = (lm, torso = TORSO) => evaluateSignal(lm, 1, CALF, { left: null, right: null }, torso);

// A stance of 0.17 across a 0.30 torso is 0.567 — just over the 0.55 minimum.
const onMinimum = standing({ backAnkleX:0.42, frontAnkleX:0.59, backKneeX:0.46, frontKneeX:0.59 });
const fullStance = standing({ backAnkleX:0.34, frontAnkleX:0.60, backKneeX:0.42, frontKneeX:0.62 });

const cases = [
  ['feet together, no stretch',      standing({ backAnkleX:0.50, frontAnkleX:0.50, backKneeX:0.50, frontKneeX:0.50 }), false, [0, 40]],
  // On the minimum: in position, but with no margin, which should read as
  // adequate rather than perfect.
  ['exactly on the minimum stance',  onMinimum,  true,  [60, 85]],
  ['full stance, back leg straight', fullStance, true,  [85, 100]],
];

let pass = 0;
let previous = -1;
let monotonic = true;
for (const [name, lm, expectIn, [lo, hi]] of cases) {
  const r = read(lm);
  const q = r === null ? null : Math.round(r.quality);
  const ok = r !== null && r.inPosition === expectIn && q >= lo && q <= hi;
  if (ok) pass++;
  if (q !== null) { if (q < previous) monotonic = false; previous = q; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(32)} inPosition=${r?.inPosition} form=${q}% (want ${lo}-${hi})`);
}

console.log(`${monotonic ? 'PASS' : 'FAIL'}  ${'form rises as the stance improves'.padEnd(32)}`);
if (monotonic) pass++;
let extra = 1;

// The regression that sent this back to the drawing board: the calf check read
// a stance as a fraction of the FRAME, so the same correct stretch performed
// further from the camera fell under the threshold and the coach reported the
// user out of position. A stretch that passes up close must pass from across
// the room, and must score the same, because it is the same stretch.
const near = read(fullStance);
let invariant = true;
for (const factor of [0.75, 0.6, 0.45]) {
  const far = read(stepBack(fullStance, factor), TORSO * factor);
  const ok = far !== null && far.inPosition === near.inPosition && Math.abs(far.quality - near.quality) < 1;
  if (!ok) invariant = false;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${`same stretch at ${Math.round(factor * 100)}% body size`.padEnd(32)}` +
      ` inPosition=${far?.inPosition} form=${far === null ? null : Math.round(far.quality)}%` +
      ` (want ${near.inPosition} / ${Math.round(near.quality)}%)`,
  );
}
if (invariant) pass++;
extra += 1;

console.log(`\n${pass}/${cases.length + extra} form-quality cases pass`);
if (pass !== cases.length + extra) process.exitCode = 1;
