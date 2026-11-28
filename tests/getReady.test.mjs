import assert from "node:assert/strict";
import { getReadyFor, fill } from "../src/data/getReady.ts";

let n = 0;
const t = (name, fn) => { fn(); n++; };

t("one-leg exercises ask for a side", () => {
  for (const s of ["standing-quad-stretch", "standing-calf-stretch", "single-leg-stand", "prom-hip-flexion"]) {
    assert.equal(getReadyFor(s, "x").sides, true, s);
  }
});
t("both-leg exercises do not", () => {
  assert.equal(getReadyFor("mini-squat", "x").sides, false);
});
t("{leg} and {other} are filled in", () => {
  assert.equal(fill("Bend your {leg} knee, stand on your {other} leg", "right"), "Bend your right knee, stand on your left leg");
  assert.equal(fill("{leg}/{other}", "left"), "right/left".replace("right/left", "left/right"));
});
t("no step is left with a placeholder", () => {
  for (const s of ["standing-quad-stretch", "standing-calf-stretch", "active-knee-extension-stretch", "single-leg-stand", "forward-lunge"]) {
    for (const leg of ["left", "right"]) for (const step of getReadyFor(s, "x").steps) assert.ok(!/[{}]/.test(fill(step, leg)), step);
  }
});
t("an unknown exercise falls back to its setup hint", () => {
  const r = getReadyFor("nope", "Stand side-on.");
  assert.equal(r.steps[0], "Stand side-on.");
  assert.equal(r.sides, false);
});
console.log(`${n}/${n} get-ready cases pass`);
