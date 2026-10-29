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

const CALF = { kind: 'splitStance', backKneeMin: 165, minSeparation: 0.13 };
const read = (lm) => evaluateSignal(lm, 1, CALF, { left: null, right: null }, 0.3);

const cases = [
  ['feet together, no stretch',      standing({ backAnkleX:0.50, frontAnkleX:0.50, backKneeX:0.50, frontKneeX:0.50 }), false, [0, 40]],
  // Separation sits exactly on the 0.13 minimum: in position, but with no
  // margin, which should read as adequate rather than perfect.
  ['exactly on the minimum stance',  standing({ backAnkleX:0.42, frontAnkleX:0.55, backKneeX:0.46, frontKneeX:0.55 }), true,  [60, 85]],
  ['full stance, back leg straight',  standing({ backAnkleX:0.34, frontAnkleX:0.56, backKneeX:0.42, frontKneeX:0.58 }), true,  [85, 100]],
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
console.log(`\n${pass}/${cases.length + 1} form-quality cases pass`);
if (pass !== cases.length + 1) process.exitCode = 1;
