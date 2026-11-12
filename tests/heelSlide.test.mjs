// Heel slides now run through the shared coach engine via the heelSlide signal.
import { evaluateSignal } from '../src/components/coach/holdMath.ts';

function lying({ ankleX, hipY = 0.6 }) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  const set = (i, x, y) => (lm[i] = { x, y, z: 0, visibility: 0.99 });
  // Lying side-on: shoulder left, hip in the middle, heel sliding toward the hip.
  set(11, 0.2, 0.6); set(12, 0.2, 0.6);
  set(23, 0.45, hipY); set(24, 0.45, hipY);
  const kneeX = (0.45 + ankleX) / 2; const kneeY = 0.6 - Math.max(0, 0.3 - Math.abs(ankleX - 0.45)) * 0.8;
  set(25, kneeX, kneeY); set(26, kneeX, kneeY);
  set(27, ankleX, 0.6); set(28, ankleX, 0.6);
  return lm;
}
const read = (lm, hipBase = 0.6) => evaluateSignal(lm, 1, { kind: 'heelSlide' }, { left: null, right: null }, null, { left: hipBase, right: hipBase });

const cases = [
  ['leg straight, not in position', read(lying({ ankleX: 0.9 })), (r) => r && !r.inPosition && /heel/i.test(r.hint)],
  ['heel drawn in, back flat', read(lying({ ankleX: 0.6 })), (r) => r && r.inPosition && !r.hint],
  ['heel drawn in but hips lifted', read(lying({ ankleX: 0.6, hipY: 0.52 })), (r) => r && !r.inPosition && /back/i.test(r.hint)],
];
let pass = 0;
for (const [n, r, ok] of cases) { const g = ok(r); if (g) pass++; console.log(`${g ? 'PASS' : 'FAIL'}  ${n.padEnd(40)} q=${r && Math.round(r.quality)} ${r && r.hint || ''}`); }
console.log(`\n${pass}/${cases.length} heel-slide cases pass`);
if (pass !== cases.length) process.exit(1);
