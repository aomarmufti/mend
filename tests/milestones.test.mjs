import { milestoneFor, nextMilestone } from '../src/lib/milestones.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);

check('no message between milestones', milestoneFor(1) === null && milestoneFor(5) === null && milestoneFor(0) === null, '');
check('message at 3, 7 and 30', milestoneFor(3)?.days === 3 && milestoneFor(7)?.days === 7 && milestoneFor(30)?.days === 30, '');
check('every milestone has text', [3, 7, 14, 30, 60, 100].every((d) => (milestoneFor(d)?.line ?? '').length > 10), '');
check('next milestone from 5 is 7, two days away', (() => { const n = nextMilestone(5); return n?.days === 7 && n?.away === 2; })(), '');
check('next milestone from 3 is 7', nextMilestone(3)?.days === 7, '');
check('nothing after the last milestone', nextMilestone(100) === null, '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : JSON.stringify(got)}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} milestone cases pass`);
process.exit(failed ? 1 : 0);
