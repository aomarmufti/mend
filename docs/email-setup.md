# Waitlist confirmation email (Resend)

The sign-up route already sends a confirmation email to each **new** address (not to
addresses already on the list). It stays off until a Resend API key is set. Until
then sign-ups are still saved, and the server log says
`[waitlist] RESEND_API_KEY is not set`.

## One-time setup (about 15 minutes)

1. **Create a Resend account** at resend.com. The free plan covers 3,000 emails a month (100 a day).
2. **Add the domain.** Domains > Add Domain > `reknit.co.uk`. Pick the Ireland (eu-west-1) region.
3. **Add the DNS records Resend shows you** in Namecheap: Domain List > Manage > Advanced DNS > Add New Record. Copy each Type, Host and Value exactly. There are usually a TXT for DKIM, a TXT for SPF and an MX, on a `send` subdomain, so your existing A and CNAME records are untouched. Then click Verify in Resend.
4. **Create an API key.** API Keys > Create API Key > permission "Sending access", limited to `reknit.co.uk`. Copy it once.
5. **Add it to Vercel** (not to chat or Git): Project `mend` > Settings > Environment Variables > `RESEND_API_KEY`, for Production and Preview, marked Sensitive.
6. **Redeploy** so it takes effect: Deployments > the latest production deployment > Redeploy.

Optional: set `EMAIL_FROM` (default `Reknit <waitlist@reknit.co.uk>`). Replies go to `reknit.support@gmail.com`.

## Test it
Submit a **new** address on `reknit.co.uk/landing#waitlist` and check the inbox and spam folder. If nothing arrives, open Vercel > Logs and look for `[waitlist] confirmation email failed`.

## Good to know
- Repeat sign-ups with the same address are accepted but don't send another email.
- Before emailing the list about the beta, export it from Supabase (`reknit` > Table Editor > `waitlist` > Export CSV) and include a way to opt out in every message.
- Later improvement: double opt-in (people click a link to confirm). It is stricter than the law needs for service updates but stops anyone signing up someone else's address.
