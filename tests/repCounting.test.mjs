// Rep counting is the number the user is asked to trust and the number a
// clinician would read. These cases pin the behaviour that matters: a short
// hold never counts, a long one counts once, a sensor blink is forgiven, a
// real release is not, and an unreadable camera can never bank a rep.
// Run with: npm test

import { trackHold, initialHoldTracker, resolveInPosition, initialReadability } from '../src/components/coach/holdMath.ts';
const CFG = { minHoldMs: 15000, graceMs: 600, nearlyThereMs: 3000 };

function run(frames) {               // frames: [inPositionOrNull, ms] steps at 33ms
  let h = initialHoldTracker, r = initialReadability, reps = 0, t = 0;
  for (const [signal, dur] of frames) {
    for (let e = 0; e < dur; e += 33) {
      t += 33;
      const res = resolveInPosition(r, signal === null ? null : { inPosition: signal, side: 'left', kneeAngle: null, hipAngle: null }, t);
      r = res.tracker;
      const out = trackHold(h, res.inPosition, t, CFG);
      h = out.tracker;
      if (out.repBanked) reps += 1;
    }
  }
  return reps;
}
const cases = [
  ['3 clean 16s holds, released between',        [[false,1000],[true,16000],[false,1000],[true,16000],[false,1000],[true,16000]], 3],
  ['held 14.5s then released — must NOT count',  [[false,500],[true,14500],[false,2000]], 0],
  ['one 50s hold is ONE rep, not three',         [[false,500],[true,50000]], 1],
  ['300ms sensor dropout mid-hold is forgiven',  [[false,500],[true,8000],[false,300],[true,8000]], 1],
  ['1s genuine release mid-hold resets it',      [[false,500],[true,8000],[false,1000],[true,8000],[false,500]], 0],
  ['unreadable >1s cannot bank a rep',           [[false,500],[true,10000],[null,6000]], 0],
  ['unreadable <1s mid-hold is carried',         [[false,500],[true,14000],[null,900],[true,1000]], 1],
  ['5 holds when target is 3 — counts all 5',    [[false,500],...Array(5).fill([[true,16000],[false,1000]]).flat()], 5],
];
let pass = 0;
for (const [name, frames, expect] of cases) {
  const got = run(frames);
  const ok = got === expect;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} expected ${expect}, got ${got}`);
}
console.log(`\n${pass}/${cases.length} rep-counting cases pass`);
process.exit(pass === cases.length ? 0 : 1);
