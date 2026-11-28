import { buildReminderIcs, parseTime } from '../src/lib/calendar.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const now = new Date(Date.UTC(2026, 10, 28, 10, 0, 0));
const ics = buildReminderIcs({ time: '08:00', label: 'Knee', minutes: 9, startDate: '2026-11-29', now });

check('parses valid times only', parseTime('08:30')?.h === 8 && parseTime('24:00') === null && parseTime('8:30') === null && parseTime(null) === null, '');
check('is a calendar with one event', ics.startsWith('BEGIN:VCALENDAR') && ics.includes('BEGIN:VEVENT') && ics.trim().endsWith('END:VCALENDAR'), '');
check('starts at the chosen local time, floating', ics.includes('DTSTART:20261129T080000') && !/DTSTART:[^\r\n]*Z/.test(ics), '');
check('repeats daily with an alert at the start', ics.includes('RRULE:FREQ=DAILY') && ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:PT0S'), '');
check('uses CRLF line endings and no line over 75 characters', ics.includes('\r\n') && ics.split('\r\n').every((l) => l.length <= 75), '');
check('has a stable id so re-adding replaces, not duplicates', ics.includes('UID:reknit-daily-0800@reknit.co.uk'), '');
check('links back to the app', ics.includes('https://reknit.co.uk/today'), '');
check('strips unsafe characters from the label', !buildReminderIcs({ time: '08:00', label: 'Knee\r\nEND:VEVENT;<x>', minutes: 9, startDate: '2026-11-29', now }).includes('<x>'), '');
let threw = false; try { buildReminderIcs({ time: '99:99', label: 'x', minutes: 9, startDate: '2026-11-29', now }); } catch { threw = true; }
check('rejects an invalid time', threw, '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : got}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} calendar cases pass`);
process.exit(failed ? 1 : 0);
