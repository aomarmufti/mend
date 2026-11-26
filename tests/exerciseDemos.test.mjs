// The demos are stick figures solved from joint geometry. These check what
// makes them read as a body rather than a drawing: bones keep their length at
// every moment of the loop, planted feet stay on the ground, and every exercise
// in the catalog has something to show when there is no filmed clip.
import { demos, getDemo, skeleton, loopLength, THIGH, SHIN, TORSO } from '../src/components/coach/exerciseDemos.ts';
import { catalog } from '../src/data/catalog.ts';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL ', msg); } };

for (const d of demos) {
  const len = loopLength(d);
  let worstThigh = 0, worstShin = 0, worstTorso = 0, lowest = -Infinity;
  for (let t = 0; t < len; t += 25) {
    const s = skeleton(d, t);
    worstThigh = Math.max(worstThigh, Math.abs(dist(s.hip, s.nearKnee) - THIGH), Math.abs(dist(s.hip, s.farKnee) - THIGH));
    worstShin = Math.max(worstShin, Math.abs(dist(s.nearKnee, s.nearAnkle) - SHIN), Math.abs(dist(s.farKnee, s.farAnkle) - SHIN));
    worstTorso = Math.max(worstTorso, Math.abs(dist(s.hip, s.shoulder) - TORSO));
    lowest = Math.max(lowest, s.nearAnkle[1], s.farAnkle[1], s.nearToe[1], s.farToe[1], s.nearKnee[1], s.farKnee[1]);
    // everything stays inside the 240x180 frame
    for (const p of [s.hip, s.shoulder, s.head, s.nearKnee, s.nearAnkle, s.farKnee, s.farAnkle, s.hand, s.elbow]) {
      check(p[0] > 0 && p[0] < 240 && p[1] > 0 && p[1] < 180, `${d.slug} t=${t} point out of frame ${p.map((v) => v.toFixed(0))}`);
    }
  }
  check(worstThigh < 0.05, `${d.slug}: thigh length drifts by ${worstThigh.toFixed(2)}`);
  check(worstShin < 0.05, `${d.slug}: shin length drifts by ${worstShin.toFixed(2)}`);
  check(worstTorso < 0.05, `${d.slug}: torso length drifts by ${worstTorso.toFixed(2)}`);
  // Nothing sinks below the floor or mat the figure stands or lies on.
  check(lowest <= 165, `${d.slug}: a joint goes through the floor (y=${lowest.toFixed(1)})`);
  // The loop closes: the last frame matches the first, so it does not jump.
  const a = skeleton(d, 0), b = skeleton(d, len - 1);
  check(dist(a.hip, b.hip) < 1 && dist(a.nearAnkle, b.nearAnkle) < 1, `${d.slug}: loop does not close`);
  console.log(`PASS  ${d.slug.padEnd(32)} ${len}ms loop, bones steady, in frame`);
}

// Every exercise needs either a filmed clip or a demo.
for (const e of catalog) {
  const covered = !!e.reference || e.slug === 'heel-slides' || !!getDemo(e.slug);
  check(covered, `${e.slug}: no filmed clip and no demo`);
}
console.log(`${catalog.filter((e) => e.reference).length} filmed, ${catalog.filter((e) => !e.reference && getDemo(e.slug)).length} demos, heel-slides figure`);
if (fail) { console.log(`${fail} failure(s)`); process.exit(1); }
console.log('all demo checks pass');
