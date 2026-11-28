import { shouldStop, suggestStage, stageReadiness } from '../src/lib/safety.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const p = (...v) => v.map((value, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, value }));

check('stop at 7', shouldStop(7) && !shouldStop(6), '');
check('no data, no suggestion', suggestStage({ stage: 'Middle', pain: [], trainedLast14: 10 }) === null, '');
check('high pain steps back', suggestStage({ stage: 'Middle', pain: p(3, 8), trainedLast14: 5 })?.kind === 'step-back', '');
check('cannot step back from Early', suggestStage({ stage: 'Early', pain: p(3, 8), trainedLast14: 5 }) === null, '');
check('sustained rise steps back', suggestStage({ stage: 'Late', pain: p(2, 3, 5, 6), trainedLast14: 5 })?.kind === 'step-back', '');
check('calm and regular suggests progress', suggestStage({ stage: 'Early', pain: p(4, 3, 2, 2), trainedLast14: 9 })?.to === 'Middle', '');
check('calm but irregular does not', suggestStage({ stage: 'Early', pain: p(3, 2, 2), trainedLast14: 4 }) === null, '');
check('no progress past Late', suggestStage({ stage: 'Late', pain: p(2, 2, 1), trainedLast14: 12 }) === null, '');

check('readiness: not enough check-ins yet', stageReadiness({ pain: p(2, 2), trainedLast14: 10 }).painOk === false, '');
check('readiness: pain and days both met', stageReadiness({ pain: p(4, 3, 2, 2), trainedLast14: 9 }).ready === true, '');
check('readiness: pain fine, days short', (() => { const r = stageReadiness({ pain: p(3, 2, 2), trainedLast14: 5 }); return r.painOk && !r.daysOk && !r.ready; })(), '');

let failed = 0;
for (const [name, ok, got] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : got}`);
  if (!ok) failed++;
}
console.log(`${results.length - failed}/${results.length} safety cases pass`);
process.exit(failed ? 1 : 0);
