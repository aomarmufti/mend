import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Stores a waitlist email in Supabase (table in supabase/waitlist.sql).
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server. Without them
 * it says so plainly rather than pretending the address was saved.
 */
export async function POST(req: Request) {
  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    /* falls through to the validation error */
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "The waitlist isn't open yet. Please try again soon." }, { status: 503 });
  }

  const res = await fetch(`${url}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email }),
  });
  // 409 means this address is already on the list, which is a success for them.
  if (!res.ok && res.status !== 409) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
