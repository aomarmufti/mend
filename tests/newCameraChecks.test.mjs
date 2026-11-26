// The three camera checks added for isometric knee extension, hip abduction and
// single leg squat. Synthetic landmarks go through the real `evaluateSignal`
// with the shipped configs, so a threshold change in coachedExercises.ts is
// tested here, not a copy of it.
//
// What this does NOT show: that the checks work on a real person on a real
// camera. These are protocol thresholds (calibration "protocol"), and nothing
// here replaces filming someone doing the exercise.
import { evaluateSignal } from '../src/components/coach/holdMath.ts';
import { coachedExercises } from '../src/data/coachedExercises.ts';

const I = { lSh: 11, rSh: 12, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnk: 27, rAnk: 28 };
function pose(pts) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  for (const [i, [x, y]] of Object.entries(pts)) lm[i] = { x, y, z: 0, visibility: 0.99 };
  return lm;
}
const NONE = { left: null, right: null };
const TORSO = 0.3;
const sig = (slug) => coachedExercises[slug].config.signal;
const read = (slug, lm) => evaluateSignal(lm, 1, sig(slug), NONE, TORSO);

let fail = 0;
function expect(name, r, inPosition) {
  const ok = r !== null && r.inPosition === inPosition;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} inPosition=${r?.inPosition} form=${r ? Math.round(r.quality) : '-'}%${r?.hint ? `  "${r.hint}"` : ''}`);
}

// ---- isometric knee extension: lying on the back, side-on, leg straight -------
const lying = (kneeY, ankleY) => pose({
  [I.lSh]: [0.2, 0.62], [I.rSh]: [0.2, 0.62],
  [I.lHip]: [0.4, 0.62], [I.rHip]: [0.4, 0.62],
  [I.lKnee]: [0.6, kneeY], [I.rKnee]: [0.6, kneeY],
  [I.lAnk]: [0.8, ankleY], [I.rAnk]: [0.8, ankleY],
});
expect('isometric: leg flat and straight',            read('isometric-knee-extension', lying(0.62, 0.62)), true);
expect('isometric: knee slightly raised, near straight', read('isometric-knee-extension', lying(0.60, 0.62)), true);
expect('isometric: knee bent up',                     read('isometric-knee-extension', lying(0.45, 0.62)), false);

// ---- hip abduction: lying on the side facing the camera ----------------------
const side = (topAnkleY) => pose({
  [I.lSh]: [0.2, 0.7], [I.rSh]: [0.2, 0.7],
  [I.lHip]: [0.4, 0.7], [I.rHip]: [0.4, 0.7],
  [I.lKnee]: [0.6, 0.7], [I.rKnee]: [0.6, 0.5 + (topAnkleY - 0.5) / 2 + 0.1],
  [I.lAnk]: [0.8, 0.7], [I.rAnk]: [0.78, topAnkleY],
});
expect('hip abduction: legs together',                read('hip-abduction', side(0.70)), false);
expect('hip abduction: top leg barely lifted (10 deg)', read('hip-abduction', side(0.70 - 0.4 * Math.tan(10 * Math.PI / 180))), false);
expect('hip abduction: top leg lifted (35 deg)',      read('hip-abduction', side(0.70 - 0.4 * Math.tan(35 * Math.PI / 180))), true);

// ---- single leg squat: side-on standing ---------------------------------------
// Left leg planted. Right ankle height sets the lift; the left knee x sets the bend.
const slsq = ({ liftedAnkleY, kneeX }) => pose({
  [I.lSh]: [0.5, 0.2], [I.rSh]: [0.5, 0.2],
  [I.lHip]: [0.5, 0.5], [I.rHip]: [0.5, 0.5],
  [I.lKnee]: [kneeX, 0.72], [I.lAnk]: [0.5, 0.94],
  [I.rKnee]: [0.56, 0.68], [I.rAnk]: [0.5, liftedAnkleY],
});
expect('single leg squat: standing tall, foot lifted',   read('single-leg-squat', slsq({ liftedAnkleY: 0.80, kneeX: 0.5 })), false);
expect('single leg squat: tiny bend (164 deg)',          read('single-leg-squat', slsq({ liftedAnkleY: 0.80, kneeX: 0.53 })), false);
expect('single leg squat: real bend, foot lifted',       read('single-leg-squat', slsq({ liftedAnkleY: 0.80, kneeX: 0.58 })), true);
expect('single leg squat: bent but both feet on floor',  read('single-leg-squat', slsq({ liftedAnkleY: 0.93, kneeX: 0.58 })), false);

// Quality should climb as the bend deepens, not snap between two values.
const q = (x) => read('single-leg-squat', slsq({ liftedAnkleY: 0.80, kneeX: x })).quality;
const mono = q(0.50) <= q(0.53) && q(0.53) <= q(0.58) && q(0.58) <= q(0.62);
if (!mono) fail++;
console.log(`${mono ? 'PASS' : 'FAIL'}  single leg squat: form % rises as the knee bends (${[0.50, 0.53, 0.58, 0.62].map((x) => Math.round(q(x))).join(' → ')})`);

// A planted leg whose chain can't be seen reads as unreadable, not as a pass.
const hidden = slsq({ liftedAnkleY: 0.80, kneeX: 0.58 });
hidden[I.lKnee].visibility = 0.1;
const h = read('single-leg-squat', hidden);
const hok = h === null;
if (!hok) fail++;
console.log(`${hok ? 'PASS' : 'FAIL'}  single leg squat: hidden standing knee is unreadable, not a pass`);

if (fail) { console.log(`${fail} failure(s)`); process.exit(1); }
console.log('all new camera-check cases pass');
