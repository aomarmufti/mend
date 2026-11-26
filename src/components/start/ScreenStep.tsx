"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetupHeader } from "@/components/flow/SetupHeader";
import { Card, btnPrimary, btnSecondary } from "@/components/ui/kit";
import { RED_FLAGS } from "@/lib/safety";

/** Setup, before the pain step: stops anyone who needs a clinician before exercise. */
export function ScreenStep({ conditionSlug, areaSlug, adding }: { conditionSlug: string; areaSlug: string; adding: boolean }) {
  const router = useRouter();
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const flagged = ticked.size > 0;
  const q = `?c=${conditionSlug}${adding ? "&add=1" : ""}`;

  const toggle = (i: number) =>
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <SetupHeader
        step={2}
        back={`/start/${areaSlug}${adding ? "?add=1" : ""}`}
        title="A quick safety check"
        subtitle="Tick anything that applies to you right now."
      />
      <div className="mt-5 space-y-2.5">
        {RED_FLAGS.map((text, i) => (
          <button key={text} type="button" onClick={() => toggle(i)} aria-pressed={ticked.has(i)} className="block w-full text-left">
            <Card className={ticked.has(i) ? "ring-2 ring-[#E0905A]" : ""}>
              <span className="flex gap-3 font-sans text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-extrabold ${
                    ticked.has(i) ? "border-[#E0905A] bg-[#E0905A] text-white" : "border-ink/30"
                  }`}
                >
                  {ticked.has(i) ? "✓" : ""}
                </span>
                {text}
              </span>
            </Card>
          </button>
        ))}
      </div>

      {flagged && (
        <Card className="mt-4 bg-white">
          <p className="font-sans text-sm font-extrabold">Please get medical advice before you exercise</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-ink/70">
            What you ticked can need checking by a clinician first. Call NHS 111, or 999 if it is an emergency. You can
            come back to Reknit once you have been seen.
          </p>
        </Card>
      )}

      <div className="flex-1" />
      {flagged ? (
        <Link href="/welcome" className={`${btnSecondary} mt-6 text-center`}>
          Leave for now
        </Link>
      ) : (
        <button type="button" onClick={() => router.push(`/start/pain${q}`)} className={`${btnPrimary} mt-6`}>
          None of these apply
        </button>
      )}
    </div>
  );
}
