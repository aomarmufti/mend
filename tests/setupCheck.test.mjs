import assert from 'node:assert/strict';
import { assessSetup, stepGate, initialGate, DEFAULT_SETUP, HINT_COPY } from '../src/components/coach/setupCheck.ts';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('PASS ', name); };

// Standing figure: head-to-feet spans `h` of frame height, centred at raw x=cx.
// `sh` is the half-gap between shoulders/hips in raw x (side-on ~0.02, front ~0.18).
function figure({ h = 0.7, cx = 0.5, sh = 0.02, top } = {}) {
  const y0 = top ?? (1 - h) / 2;
  const lm = Array.from({ length: 33 }, () => ({ x: cx, y: y0 + h / 2, visibility: 0.99 }));
  const set = (i, x, y) => { lm[i] = { x, y, visibility: 0.99 }; };
  set(0, cx, y0);
  set(11, cx - sh, y0 + 0.18 * h); set(12, cx + sh, y0 + 0.18 * h);
  set(23, cx - sh, y0 + 0.5 * h);  set(24, cx + sh, y0 + 0.5 * h);
  set(25, cx - sh, y0 + 0.72 * h); set(26, cx + sh, y0 + 0.72 * h);
  set(27, cx - sh, y0 + h);        set(28, cx + sh, y0 + h);
  return lm;
}
const A = 9 / 16; // portrait phone frame, width/height
const lit = { luma: 0.5 };
const hint = (lm, frame = lit, spec = DEFAULT_SETUP) => assessSetup(lm, frame, A, spec).hint;

t('no detection says step into view', () => assert.equal(hint(null), 'no-body'));
t('good distance and position is ready', () => assert.equal(hint(figure()), 'ready'));
t('too far away says come closer', () => assert.equal(hint(figure({ h: 0.35 })), 'come-closer'));
t('too close says step back', () => assert.equal(hint(figure({ h: 0.95, top: 0.025 })), 'step-back'));
t('feet cut off by the bottom says step back', () => assert.equal(hint(figure({ h: 0.7, top: 0.4 })), 'step-back'));
t('low confidence joints say get whole body in view', () => {
  const lm = figure(); lm[27].visibility = 0.2;
  assert.equal(hint(lm), 'not-visible');
});
t('displayed on the left of a mirrored preview says move right', () => {
  // raw x 0.8 -> displayed x 0.2 (left of mirror)
  assert.equal(hint(figure({ cx: 0.8 })), 'move-right');
  assert.equal(hint(figure({ cx: 0.2 })), 'move-left');
});
t('front-on when side-on is required says turn', () => {
  const spec = { ...DEFAULT_SETUP, orientation: 'side' };
  assert.equal(hint(figure({ sh: 0.18 }), lit, spec), 'turn-side');
  assert.equal(hint(figure({ sh: 0.02 }), lit, spec), 'ready');
});
t('side-on when facing is required says face camera', () => {
  const spec = { ...DEFAULT_SETUP, orientation: 'front' };
  assert.equal(hint(figure({ sh: 0.015 }), lit, spec), 'face-camera');
});
t('dark frame says more light', () => assert.equal(hint(figure(), { luma: 0.05 }), 'more-light'));
t('unmeasured light is not held against the user', () => assert.equal(hint(figure(), { luma: null }), 'ready'));
t('every hint has copy', () => { for (const k of ['no-body','step-back','come-closer','move-left','move-right','turn-side','more-light','hold-still','ready']) assert.ok(HINT_COPY[k]); });

// gate
const ready = assessSetup(figure(), lit, A);
t('gate: ready but not yet steady says hold still, then counts 3 2 1 then goes', () => {
  let g = initialGate; let now = 0; let s;
  s = stepGate(g, ready, now); assert.equal(s.hint, 'hold-still'); g = s.state;
  now = 700; s = stepGate(g, ready, now); assert.equal(s.count, 3); g = s.state;
  now = 1800; s = stepGate(g, ready, now); assert.equal(s.count, 2); g = s.state;
  now = 2800; s = stepGate(g, ready, now); assert.equal(s.count, 1); g = s.state;
  now = 3800; s = stepGate(g, ready, now); assert.equal(s.go, true);
});
t('gate: leaving position during the count cancels it', () => {
  let g = initialGate; let s = stepGate(g, ready, 0); g = s.state;
  s = stepGate(g, ready, 700); g = s.state; assert.equal(s.count, 3);
  const away = assessSetup(figure({ h: 0.3 }), lit, A);
  s = stepGate(g, away, 1200); assert.equal(s.count, null); assert.equal(s.state.phase, 'aligning'); assert.equal(s.hint, 'come-closer');
});
t('gate: walking about during the count restarts steadying', () => {
  let g = initialGate; let s = stepGate(g, ready, 0); g = s.state;
  s = stepGate(g, ready, 700); g = s.state; assert.equal(s.count, 3);
  const moved = assessSetup(figure({ cx: 0.62 }), lit, A); // jumped 0.12 in 100ms
  s = stepGate(g, moved, 800); assert.equal(s.count, null); assert.equal(s.hint, 'hold-still');
});
console.log(`${n}/${n} setup-check cases pass`);
