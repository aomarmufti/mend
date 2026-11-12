// Calendar and streak helpers behind Today and Progress.
import { monthGrid, streakFrom, weekStrip, painChange } from '../src/lib/progress.ts';

const today = new Date(2026, 10, 11); // Wed 11 Nov 2026
const days = new Set(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-05']);
const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);

check('streak counts back from today', streakFrom(days, today) === 3, streakFrom(days, today));
check('streak from yesterday when today not done', streakFrom(new Set(['2026-11-10', '2026-11-09']), today) === 2, '');
check('no streak after a gap', streakFrom(new Set(['2026-11-08']), today) === 0, '');
const w = weekStrip(days, today);
check('week starts Monday 9th', w[0].key === '2026-11-09' && w[0].letter === 'M', w[0].key);
check('week states', w.map((d) => d.state).join(',') === 'done,done,done,upcoming,upcoming,upcoming,upcoming', w.map((d) => d.state).join(','));
const g = monthGrid(2026, 10, days, today);
// 1 Nov 2026 is a Sunday: six blanks before it in a Monday-first grid.
check('six leading blanks for November 2026', g.slice(0, 6).every((c) => c === null) && g[6].day === 1, g.findIndex((c) => c));
check('30 days', g.filter(Boolean).length === 30, '');
check('today flagged, future flagged', g.find((c) => c && c.day === 11).isToday && g.find((c) => c && c.day === 12).future, '');
check('pain change needs two', painChange([{ date: 'a', value: 6 }]) === null, '');
const pc = painChange([{ date: 'a', value: 6 }, { date: 'b', value: 5 }, { date: 'c', value: 4 }]);
check('pain down 2', pc.delta === -2 && pc.start === 6 && pc.now === 4, JSON.stringify(pc));

let pass = 0;
for (const [n, c, got] of results) { if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n.padEnd(44)} ${got}`); }
console.log(`\n${pass}/${results.length} progress cases pass`);
if (pass !== results.length) process.exit(1);
