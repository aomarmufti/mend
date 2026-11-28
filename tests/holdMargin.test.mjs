import { holdWithMargin, STAY_QUALITY, trackHold, initialHoldTracker, DEFAULT_HOLD_CONFIG } from '../src/components/coach/holdMath.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const reading = (inPosition, quality) => ({ inPosition, quality, side: 'left', kneeAngle: null, hipAngle: null });

check('getting in still needs the real target', holdWithMargin(reading(false, 80), false).inPosition === false, '');
check('mid-hold, just outside the target still counts', holdWithMargin(reading(false, STAY_QUALITY + 5), true).inPosition === true, '');
check('mid-hold, clearly out does not count', holdWithMargin(reading(false, STAY_QUALITY - 20), true).inPosition === false, '');
check('already in stays in', holdWithMargin(reading(true, 90), true).inPosition === true, '');
check('no reading stays no reading', holdWithMargin(null, true) === null, '');

// A hold where the reading dips out for 900 ms in the middle must not reset with the default settings.
const cfg = { ...DEFAULT_HOLD_CONFIG, minHoldMs: 8000 };
let tr = initialHoldTracker; let banked = false; let resets = 0;
for (let t = 0; t <= 9000; t += 100) {
  const inPos = !(t >= 3000 && t < 3900);
  const prev = tr.phase;
  const h = trackHold(tr, inPos, t, cfg);
  if (prev === 'holding' && h.tracker.phase === 'seeking') resets++;
  if (h.repBanked) banked = true;
  tr = h.tracker;
}
check('a 0.9 s dropout mid-hold does not reset it', resets === 0 && banked, `resets ${resets} banked ${banked}`);

// ...and really leaving (about 6 s) still ends it; a 2 s step out only pauses it.
function endedWith(outFrom, outTo) {
  let t2 = initialHoldTracker; let ended = false;
  for (let t = 0; t <= 14000; t += 100) {
    const h = trackHold(t2, !(t >= outFrom && t < outTo), t, cfg);
    if (h.cue === 'banked-partial' || h.cue === 'released-early') ended = true;
    t2 = h.tracker;
  }
  return ended;
}
check('leaving for about 6 s still ends the hold', endedWith(3000, 9000), '');
check('a 2 s step out only pauses it', !endedWith(3000, 5000), '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : got}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} hold margin cases pass`);
process.exit(failed ? 1 : 0);
