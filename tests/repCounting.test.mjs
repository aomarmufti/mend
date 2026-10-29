// Rep counting is the number the user is asked to trust and the number a
// clinician would read. These cases pin the behaviour that matters: a short
// hold never counts, a long one counts once, a sensor blink is forgiven, a
// real release is not, and an unreadable camera can never bank a rep.
// Run with: npm test

import { trackHold, initialHoldTracker, resolveInPosition, initialReadability } from '../src/components/coach/holdMath.ts';
const CFG = { minHoldMs: 15000, graceMs: 600, nearlyThereMs: 3000, minPartialMs: 5000 };

function run(frames) {               // frames: [inPositionOrNull, ms] steps at 33ms
  let h = initialHoldTracker, r = initialReadability, reps = 0, partials = 0, t = 0;
  for (const [signal, dur] of frames) {
    for (let e = 0; e < dur; e += 33) {
      t += 33;
      const res = resolveInPosition(r, signal === null ? null : { inPosition: signal, side: 'left', kneeAngle: null, hipAngle: null }, t);
      r = res.tracker;
      const out = trackHold(h, res.inPosition, t, CFG);
      h = out.tracker;
      if (out.repBanked) { reps += 1; if (out.partial) partials += 1; }
    }
  }
  return { reps, partials };
}
// [name, frames, expected total sets, expected partial sets]
const cases = [
  ['3 clean 16s holds, released between',        [[false,1000],[true,16000],[false,1000],[true,16000],[false,1000],[true,16000]], 3, 0],
  ['one 50s hold is ONE set, not three',         [[false,500],[true,50000]], 1, 0],
  ['300ms sensor dropout mid-hold is forgiven',  [[false,500],[true,8000],[false,300],[true,8000]], 1, 0],
  ['unreadable >1s banks partial, never full',   [[false,500],[true,10000],[null,6000]], 1, 1],
  ['unreadable <1s mid-hold is carried',         [[false,500],[true,14000],[null,900],[true,1000]], 1, 0],
  ['5 holds when target is 3 — counts all 5',    [[false,500],...Array(5).fill([[true,16000],[false,1000]]).flat()], 5, 0],
  // Partial credit: switching legs early still counts, and is flagged.
  ['14.5s then released — counts, partial',      [[false,500],[true,14500],[false,2000]], 1, 1],
  ['9s then switched legs — counts, partial',    [[false,500],[true,9000],[false,2000]], 1, 1],
  ['two short holds — two partial sets',         [[false,500],[true,8000],[false,1000],[true,8000],[false,1000]], 2, 2],
  // Below minPartialMs is a drop-out, not a set.
  ['3s then released — too short to count',      [[false,500],[true,3000],[false,2000]], 0, 0],
  ['grace window is not extra credit',           [[false,500],[true,4600],[false,2000]], 0, 0],
];
let pass = 0;
for (const [name, frames, expect, expectPartial] of cases) {
  const got = run(frames);
  const ok = got.reps === expect && got.partials === expectPartial;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} expected ${expect}/${expectPartial}p, got ${got.reps}/${got.partials}p`);
}
console.log(`\n${pass}/${cases.length} hold-counting cases pass`);
if (pass !== cases.length) process.exitCode = 1;

// ---------------------------------------------------------------------------
// Rep mode: squats and lunges. A rep banks on the way back OUT of the target
// zone, so these pin the cases where that distinction decides the number.
// ---------------------------------------------------------------------------
import { trackReps, initialRepTrackerState } from '../src/components/coach/holdMath.ts';
const RCFG = { minInZoneMs: 350, minRepMs: 800, graceMs: 250 };

function runReps(frames) {
  let t = initialRepTrackerState, reps = 0, clock = 0;
  for (const [signal, dur] of frames) {
    for (let e = 0; e < dur; e += 33) {
      clock += 33;
      const out = trackReps(t, signal, clock, RCFG);
      t = out.tracker;
      if (out.repBanked) reps += 1;
    }
  }
  return reps;
}

const repCases = [
  ['3 squats, down ~1s then back up',        [[false,900],...Array(3).fill([[true,1000],[false,1000]]).flat()], 3],
  ['stays at the bottom — not a rep yet',    [[false,500],[true,6000]], 0],
  ['...and counts once they stand back up',  [[false,500],[true,6000],[false,900]], 1],
  ['bounce through the zone does not count', [[false,500],[true,120],[false,900]], 0],
  ['chatter on the threshold counts once',   [[false,500],[true,600],[false,100],[true,600],[false,900]], 1],
  // Two full down-up cycles 660ms apart. Nobody squats that fast; this is the
  // signal chattering, and minRepMs is what stops it inflating the count.
  ['two cycles inside minRepMs → one rep',    [[false,500],[true,400],[false,290],[true,400],[false,900]], 1],
  ['never reaching depth counts nothing',    [[false,6000]], 0],
  ['10 clean reps count 10',                 [[false,900],...Array(10).fill([[true,600],[false,900]]).flat()], 10],
];

let repPass = 0;
for (const [name, frames, expect] of repCases) {
  const got = runReps(frames);
  const ok = got === expect;
  if (ok) repPass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} expected ${expect}, got ${got}`);
}
console.log(`\n${repPass}/${repCases.length} rep-mode cases pass`);
if (repPass !== repCases.length) process.exitCode = 1;
