import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Stores a waitlist email in Supabase (table in supabase/waitlist.sql).
 * Needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the server. The publishable
 * key is not a secret: row-level security lets it insert an address and nothing
 * else. Without the settings it says so plainly rather than pretending the
 * address was saved.
 */
export async function POST(req: Request) {
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
  // 409 means this address is already on the list, which is a success for them.
  if (!res.ok && res.status !== 409) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
