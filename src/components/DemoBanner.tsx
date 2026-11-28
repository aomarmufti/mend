"use client";

import Link from "next/link";
import { useDemoActive } from "@/lib/demoData";

/** A plain label whenever sample history is loaded, so it is never mistaken for real progress. */
export function DemoBanner() {
  const active = useDemoActive();
  if (!active) return null;
  return (
    <p className="rounded-2xl bg-amber-soft px-3.5 py-2 font-sans text-xs font-bold text-amber">
      Sample history is loaded for a demonstration.{" "}
      <Link href="/settings" className="underline">
        Remove it in Settings
      </Link>
    </p>
  );
}
