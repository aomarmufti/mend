import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Crude per-instance limit so a crash loop can't flood the logs.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
let windowStart = 0;
let count = 0;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

/**
 * Receives browser errors and writes one structured line to the server log, where
 * the host's log viewer can search it. No health data is ever sent: only the
 * error text, the page path and the browser string.
 */
export async function POST(req: Request) {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    count = 0;
  }
  if (++count > MAX_PER_WINDOW) return new NextResponse(null, { status: 429 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    console.error(
      "[client-error]",
      JSON.stringify({
        message: clip(body.message, 500),
        stack: clip(body.stack, 2000),
        path: clip(body.path, 200),
        ua: clip(req.headers.get("user-agent"), 200),
        at: new Date().toISOString(),
      }),
    );
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  return new NextResponse(null, { status: 204 });
}
