import { waitlistEmail } from '../src/lib/waitlistEmail.ts';
import { CONTACT_EMAIL } from '../src/lib/site.ts';

const results = [];
const check = (name, cond, got) => results.push([name, cond, got]);
const e = waitlistEmail();

check('subject mentions the waitlist', /waitlist/i.test(e.subject), e.subject);
check('text says how to be removed', e.text.includes(CONTACT_EMAIL) && /remove you/.test(e.text), '');
check('html says how to be removed', e.html.includes(`mailto:${CONTACT_EMAIL}`), '');
check('says what the email will be used for', /invite you to try an early version/.test(e.text), '');
check('includes the medical disclaimer', /not a medical device/.test(e.text) && /not a medical device/.test(e.html), '');
check('no scripts or remote images in html', !/<script|<img|https?:\/\//.test(e.html), '');

let failed = 0;
for (const [name, ok, got] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : got}`); if (!ok) failed++; }
console.log(`${results.length - failed}/${results.length} waitlist email cases pass`);
process.exit(failed ? 1 : 0);
