import { trackHold, initialHoldTracker, DEFAULT_HOLD_CONFIG } from '../src/components/coach/holdMath.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const cfg = { ...DEFAULT_HOLD_CONFIG, minHoldMs: 8000, graceMs: 1000, pauseMs: 4000, minPartialMs: 3000 };

function run(outFrom, outTo, until = 20000, config = cfg) {
  let tr = initialHoldTracker; const log = [];
  for (let t = 0; t <= until; t += 100) {
    const inPos = !(t >= outFrom && t < outTo);
    const h = trackHold(tr, inPos, t, config);
    log.push({ t, ...h });
    tr = h.tracker;
  }
  return log;
}

// Unbroken hold banks at the target.
let log = run(1e9, 1e9);
check('an unbroken hold banks at 8 s', log.find((f) => f.repBanked)?.t === 8000, log.find((f) => f.repBanked)?.t);

// 2 s out of position at 3 s: 1 s forgiven, 1 s paused, so it banks 1 s later than before.
log = run(3000, 5000);
const bank = log.find((f) => f.repBanked);
check('a 2 s step out pauses, not resets: banks about 1 s later', bank && !bank.partial && bank.t >= 9000 && bank.t <= 9200, bank?.t);
check('the timer is frozen while paused', (() => {
  const during = log.filter((f) => f.t >= 4100 && f.t < 5000);
  return during.length > 0 && during.every((f) => f.cue === 'paused' && f.paused === true && f.elapsedMs === during[0].elapsedMs);
})(), '');
check('it never fell back to zero in between', log.filter((f) => f.t > 1000 && f.t < 9000).every((f) => f.elapsedMs > 0), '');

// Out for 6 s: past grace plus pause, so the hold is given up.
log = run(4000, 10000);
const ended = log.find((f) => f.cue === 'banked-partial' || f.cue === 'released-early');
check('a long absence still ends the hold', !!ended && ended.t >= 8800 && ended.t <= 9000, ended?.t);
check('and the partial credit is for time actually held (about 4 s)', ended?.cue === 'banked-partial' && Math.abs(ended.bankedMs - 3900) <= 200, ended?.bankedMs);

// Without pauseMs it behaves as before (ends after grace).
log = run(3000, 9000, 20000, { ...cfg, pauseMs: 0 });
const early = log.find((f) => f.cue === 'banked-partial' || f.cue === 'released-early');
check('pauseMs of 0 keeps the old behaviour', !!early && early.t < 4200, early?.t);

// A frozen browser frame (a 1.5 s stall) is not held against the person.
let tr = initialHoldTracker; let bankedAt = null;
for (const t of [0, 100, 200, 300, 400, 1900, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 9500]) {
  const h = trackHold(tr, true, t, cfg); tr = h.tracker; if (h.repBanked && bankedAt === null) bankedAt = t;
}
check('a 1.5 s frame stall adds only the part beyond the grace window', bankedAt !== null && bankedAt >= 8000 && bankedAt <= 9500, bankedAt);

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : JSON.stringify(got)}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} hold pause cases pass`);
process.exit(failed ? 1 : 0);
