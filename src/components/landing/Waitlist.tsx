"use client";

import { useState } from "react";
import { btnPrimary } from "@/components/ui/kit";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: new URLSearchParams(window.location.search).get("src") ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setState("done");
      } else {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setMessage("No connection. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="font-sans text-sm font-bold text-mint">You&apos;re on the list. We&apos;ll be in touch by email.</p>;
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-full bg-white px-5 py-3.5 font-sans text-sm text-ink outline-none"
      />
      <button type="submit" disabled={state === "sending"} className={`${btnPrimary} w-full`}>
        {state === "sending" ? "Joining…" : "Join the waitlist"}
      </button>
      {state === "error" && (
        <p role="alert" className="font-sans text-xs text-white/80">
          {message}
        </p>
      )}
    </form>
  );
}
