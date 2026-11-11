import assert from 'node:assert/strict';
import { addPlan, migrateLegacy, parsePlans, removePlan, setActivePlan, activePlan, EMPTY_PLANS } from '../src/lib/plansModel.ts';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('PASS ', name); };

t('legacy single condition becomes the first, active plan', () => {
  const s = migrateLegacy('patellofemoral-pain-syndrome', 1000);
  assert.equal(s.plans.length, 1);
  assert.equal(activePlan(s).conditionSlug, 'patellofemoral-pain-syndrome');
});
t('no legacy value gives no plans', () => assert.deepEqual(migrateLegacy(null, 1), EMPTY_PLANS));
t('adding a second plan activates it, keeps the first', () => {
  let s = migrateLegacy('a', 1);
  s = addPlan(s, 'b', 2);
  assert.equal(s.plans.length, 2);
  assert.equal(activePlan(s).conditionSlug, 'b');
});
t('adding an existing condition re-activates instead of duplicating', () => {
  let s = addPlan(addPlan(EMPTY_PLANS, 'a', 1), 'b', 2);
  s = addPlan(s, 'a', 3);
  assert.equal(s.plans.length, 2);
  assert.equal(activePlan(s).conditionSlug, 'a');
});
t('removing the active plan falls back to another', () => {
  let s = addPlan(addPlan(EMPTY_PLANS, 'a', 1), 'b', 2);
  s = removePlan(s, s.activeId);
  assert.equal(s.plans.length, 1);
  assert.equal(activePlan(s).conditionSlug, 'a');
  assert.equal(removePlan(s, s.activeId).activeId, null);
});
t('setActivePlan ignores unknown ids', () => {
  const s = addPlan(EMPTY_PLANS, 'a', 1);
  assert.equal(setActivePlan(s, 'nope'), s);
});
t('malformed storage is an empty state, bad activeId repaired', () => {
  assert.deepEqual(parsePlans('{oops'), EMPTY_PLANS);
  assert.deepEqual(parsePlans('{"plans":"x"}'), EMPTY_PLANS);
  const s = parsePlans(JSON.stringify({ plans: [{ id: 'p1', conditionSlug: 'a', stageIndex: 0, startedAt: 1 }], activeId: 'gone' }));
  assert.equal(s.activeId, 'p1');
});
console.log(`${n}/${n} plan-model cases pass`);
