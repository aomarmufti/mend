import { retarget, neutralRig, BODY, cleanLook, DEFAULT_LOOK } from '../src/components/coach/avatar.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const W = 480, H = 854;

// A standing figure in normalised coordinates, as the pose model reports it.
function person(scale = 1) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
  const set = (i, x, y) => { lm[i] = { x, y, z: 0, visibility: 0.95 }; };
  const t = 0.22 * scale; // torso length as a fraction of the frame height
  const hipY = 0.55, shY = hipY - t;
  set(0, 0.5, shY - 0.07 * scale);
  set(11, 0.5 + 0.05, shY); set(12, 0.5 - 0.05, shY);
  set(23, 0.5 + 0.03, hipY); set(24, 0.5 - 0.03, hipY);
  set(13, 0.55, shY + 0.1 * scale); set(14, 0.45, shY + 0.1 * scale);
  set(15, 0.56, shY + 0.2 * scale); set(16, 0.44, shY + 0.2 * scale);
  set(25, 0.53, hipY + 0.2 * scale); set(26, 0.47, hipY + 0.2 * scale);
  set(27, 0.53, hipY + 0.4 * scale); set(28, 0.47, hipY + 0.4 * scale);
  return lm;
}

const a = retarget(person(1), W, H, null);
const b = retarget(person(1.3), W, H, null);
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

check('a figure is built from a visible torso', a !== null, '');
check('no torso, no figure', retarget(Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 })), W, H, null) === null, '');
check('thigh length is the same fraction of the torso for any build',
  Math.abs(dist(a.hp[0], a.knee[0]) / a.torso - BODY.thigh) < 0.01 && Math.abs(dist(b.hp[0], b.knee[0]) / b.torso - BODY.thigh) < 0.01,
  `${dist(a.hp[0], a.knee[0]) / a.torso} ${dist(b.hp[0], b.knee[0]) / b.torso}`);
check('upper arm and shin follow the same proportions',
  Math.abs(dist(a.sh[0], a.elbow[0]) / a.torso - BODY.upperArm) < 0.01 && Math.abs(dist(a.knee[0], a.ankle[0]) / a.torso - BODY.shin) < 0.01, '');
check('head sits above the shoulders', a.head.y < a.shoulder.y, '');
check('an unseen arm hangs down instead of vanishing', (() => {
  const lm = person(1); lm[13].visibility = 0; lm[15].visibility = 0;
  const r = retarget(lm, W, H, null);
  return r.elbow[0].y > r.sh[0].y && Math.abs(r.elbow[0].x - r.sh[0].x) < 1;
})(), '');
check('movement is smoothed, not snapped', (() => {
  const first = retarget(person(1), W, H, null);
  const moved = person(1); moved[27].x += 0.2;
  const next = retarget(moved, W, H, first);
  const snapped = retarget(moved, W, H, null);
  return Math.abs(next.ankle[0].x - first.ankle[0].x) < Math.abs(snapped.ankle[0].x - first.ankle[0].x);
})(), '');
check('the neutral figure is usable', (() => { const n = neutralRig(200, 300); return n.head.y < n.shoulder.y && n.ankle[0].y > n.hip.y; })(), '');
check('bad stored looks fall back to the default', (() => { const l = cleanLook({ skin: 'red', hairStyle: 'mohawk', top: '#112233' }); return l.skin === DEFAULT_LOOK.skin && l.hairStyle === DEFAULT_LOOK.hairStyle && l.top === '#112233'; })(), '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : JSON.stringify(got)}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} avatar cases pass`);
process.exit(failed ? 1 : 0);
