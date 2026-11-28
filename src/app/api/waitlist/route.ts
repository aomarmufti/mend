import { NextResponse, after } from "next/server";
import { CONTACT_EMAIL } from "@/lib/site";
import { waitlistEmail } from "@/lib/waitlistEmail";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Crude per-instance limit: 5 sign-ups a minute per address, so the form can't be
// used to fire a flood of emails.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

/**
 * Sends the "you're on the waitlist" email through Resend. Needs RESEND_API_KEY
 * (and a verified sending domain). Without a key it skips quietly: the sign-up is
 * still saved. A failure here never fails the sign-up.
 */
async function sendConfirmation(to: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[waitlist] RESEND_API_KEY is not set, so no confirmation email was sent");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "Reknit <waitlist@reknit.co.uk>";
  const { subject, text, html } = waitlistEmail();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html, reply_to: CONTACT_EMAIL }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[waitlist] confirmation email failed", res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error("[waitlist] confirmation email failed", err instanceof Error ? err.message : err);
  }
}

/**
 * Stores a waitlist email in Supabase (table in supabase/waitlist.sql).
 * Needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the server. The publishable
 * key is not a secret: row-level security lets it insert an address and nothing
 * else. Without the settings it says so plainly rather than pretending the
 * address was saved. A new address also gets a confirmation email; an address
 * that is already on the list does not, so nobody can be emailed repeatedly.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  let email = "";
  let source = "";
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    source = typeof body.source === "string" ? body.source.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) : "";
  } catch {
    /* falls through to the validation error */
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "The waitlist isn't open yet. Please try again soon." }, { status: 503 });
  }

  const res = await fetch(`${url}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, source: source || null }),
  });
  // 409 means this address is already on the list: a success for them, but no second email.
  if (res.status === 409) return NextResponse.json({ ok: true });
  if (!res.ok) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
  after(() => sendConfirmation(email));
  return NextResponse.json({ ok: true });
}
