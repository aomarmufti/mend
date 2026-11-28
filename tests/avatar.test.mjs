import fs from 'node:fs';
import { retarget, neutralRig, BODY, cleanLook, DEFAULT_LOOK, AvatarAnimator } from '../src/components/coach/avatar.ts';

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

// ---- motion: replay the filmed calf stretch (15 readings a second) with tracking noise, shown at 60 fps ----
const clip = JSON.parse(fs.readFileSync(new URL('../public/reference/standing-calf-stretch.landmarks.json', import.meta.url), 'utf8'));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
function reading(i, noise) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  clip.idx.forEach((id, k) => { const f = clip.f[i][k]; lm[id] = { x: f[0] + gauss() * noise, y: f[1] + gauss() * noise, z: 0, visibility: f[2] }; });
  return lm;
}
const secondDiff = (a) => { let s = 0; for (let i = 2; i < a.length; i++) s += Math.abs(a[i] - 2 * a[i - 1] + a[i - 2]); return s / (a.length - 2); };

// Unfiltered: each reading straight into the figure, drawn when it arrives.
let prev = null; const rawY = [];
for (let i = 60; i < 120; i++) { prev = retarget(reading(i, 0.004), clip.w, clip.h, prev); rawY.push(prev.ankle[0].y); }

// Filtered and glided: the same readings through the animator, sampled every 16.7 ms.
const anim = new AvatarAnimator(); const shownY = []; let now = 1000;
for (let i = 60; i < 120; i++) {
  const lm = reading(i, 0.004);
  for (let k = 0; k < 4; k++) { now += 1000 / 60; anim.update(lm, clip.w, clip.h, now); if (anim.current) shownY.push(anim.current.ankle[0].y); }
}
check('smoother than the raw tracking: far less frame-to-frame shake', secondDiff(shownY) < secondDiff(rawY) / 3, `${secondDiff(shownY).toFixed(2)} vs ${secondDiff(rawY).toFixed(2)}`);

// A real movement is followed promptly: a 0.15-of-frame step in an ankle is mostly there within 300 ms.
const step = new AvatarAnimator(); let t2 = 5000;
const still = reading(90, 0); for (let k = 0; k < 40; k++) { t2 += 16.7; step.update(still.slice(), clip.w, clip.h, t2); }
const base = step.current.ankle[0].y;
const moved = reading(90, 0); moved[27].y += 0.15; moved[25].y += 0.05; moved[23].y += 0;
const startMove = t2; let reached = null; const goal = retarget(moved, clip.w, clip.h, null).ankle[0].y;
for (let k = 0; k < 60; k++) { t2 += 16.7; step.update(moved.slice(), clip.w, clip.h, t2); if (reached === null && Math.abs(step.current.ankle[0].y - goal) < Math.abs(goal - base) * 0.2) reached = t2 - startMove; }
check('a real movement is followed within about 300 ms', reached !== null && reached < 300, reached);

// Tracking lost: the figure holds, then fades to a faint placeholder, then returns when found again.
const lost = new AvatarAnimator(); let t3 = 9000;
for (let k = 0; k < 30; k++) { t3 += 16.7; lost.update(still.slice(), clip.w, clip.h, t3); }
const before = lost.current.hip.x;
for (let k = 0; k < 120; k++) { t3 += 16.7; lost.update(null, clip.w, clip.h, t3); }
check('when tracking is lost the figure stays put (it does not jump or vanish)', lost.current !== null && Math.abs(lost.current.hip.x - before) < 1, '');
check('nothing is drawn before anyone has been seen', new AvatarAnimator().current === null, '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : JSON.stringify(got)}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} avatar cases pass`);
process.exit(failed ? 1 : 0);
