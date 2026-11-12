// Line-up checks: synthetic landmarks through the real assessFraming.
import { assessFraming } from '../src/components/coach/framing.ts';

function body(overrides = {}, vis = 0.99) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
  // Standing side-on figure, head at the top, feet near the bottom. Frames are
  // portrait (aspect 9/16), so x distances shrink by that factor: real
  // front-on shoulders are about 0.3 of the frame width apart.
  const pts = {
    0: [0.5, 0.12], 11: [0.5, 0.25], 12: [0.51, 0.25], 23: [0.5, 0.52], 24: [0.51, 0.52],
    25: [0.5, 0.7], 26: [0.51, 0.7], 27: [0.5, 0.88], 28: [0.52, 0.88],
    29: [0.48, 0.9], 30: [0.5, 0.9], 31: [0.54, 0.91], 32: [0.56, 0.91],
    ...overrides,
  };
  for (const [i, [x, y]] of Object.entries(pts)) lm[i] = { x, y, z: 0, visibility: vis };
  return lm;
}

const cases = [
  ['nobody in frame', assessFraming(null, 9 / 16, 'side', 'standing', 0.5), (r) => !r.ready && /Step into view/.test(r.instruction)],
  ['standing side-on, whole body', assessFraming(body(), 9 / 16, 'side', 'standing', 0.5), (r) => r.ready],
  ['feet cut off', assessFraming(body({ 27: [0.5, 0.995], 28: [0.52, 0.995], 29: [0.48, 1.02], 30: [0.5, 1.02], 31: [0.54, 1.03], 32: [0.56, 1.03] }), 9 / 16, 'side', 'standing', 0.5),
    (r) => !r.ready && /Step back/.test(r.instruction) && r.checks.find((c) => c.id === 'feet').label === 'Feet cut off'],
  ['facing the camera when side-on is needed', assessFraming(body({ 11: [0.35, 0.25], 12: [0.65, 0.25] }), 9 / 16, 'side', 'standing', 0.5),
    (r) => !r.ready && /side-on/.test(r.instruction)],
  ['front-on exercise, facing camera', assessFraming(body({ 11: [0.35, 0.25], 12: [0.65, 0.25], 23: [0.42, 0.52], 24: [0.58, 0.52] }), 9 / 16, 'front', 'standing', 0.5), (r) => r.ready],
  ['too far away', assessFraming(body({ 0: [0.5, 0.45], 11: [0.5, 0.5], 12: [0.505, 0.5], 23: [0.5, 0.58], 24: [0.505, 0.58], 25: [0.5, 0.63], 26: [0.5, 0.63], 27: [0.5, 0.68], 28: [0.51, 0.68], 29: [0.5, 0.69], 30: [0.5, 0.69], 31: [0.51, 0.69], 32: [0.51, 0.69] }), 9 / 16, 'side', 'standing', 0.5),
    (r) => !r.ready && /closer/.test(r.instruction)],
  ['dark room', assessFraming(body(), 9 / 16, 'side', 'standing', 0.05), (r) => !r.ready && /light/.test(r.instruction)],
];

let pass = 0;
for (const [name, result, ok] of cases) {
  const good = ok(result);
  if (good) pass++;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${result.instruction}`);
}
console.log(`\n${pass}/${cases.length} framing cases pass`);
if (pass !== cases.length) process.exit(1);
