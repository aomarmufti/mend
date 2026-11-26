"use client";

let sent = 0;
const seen = new Set<string>();

/** Sends an error to our own server log. Capped per page load and deduplicated. */
export function reportError(error: unknown) {
  if (typeof window === "undefined" || sent >= 5) return;
  const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const key = e.message + (e.stack ?? "").slice(0, 120);
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;
  try {
    const body = JSON.stringify({ message: e.message, stack: e.stack, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  } catch {
    /* reporting must never cause an error */
  }
}
