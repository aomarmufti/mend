"use client";

import Link from "next/link";
import { Card, LockIcon, Pill, TickDot, eyebrow } from "@/components/ui/kit";
import { SignInButtons } from "@/components/flow/SignInButtons";
import { getCatalogExercise, catalog } from "@/data/catalog";
import { FREE_EXERCISES, useProfile } from "@/lib/profile";
import { doneToday, useAllRecords } from "@/lib/progress";

/** Screen 2a: two camera-coached stretches, no account. */
export function TryScreen() {
  const profile = useProfile();
  const done = doneToday(useAllRecords());
  const free = FREE_EXERCISES.map((s) => getCatalogExercise(s)!);
  const locked = catalog.filter((e) => e.source === "pfps" && e.mode === "camera").slice(0, 3);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <Link href="/welcome" className="font-sans text-sm font-semibold text-ink/50">
          ← Back
        </Link>
        <Pill>{profile.account ? "Signed in" : "No account"}</Pill>
      </div>
      <h1 className="mt-3 font-display text-3xl font-extrabold">Free preview</h1>
      <p className="mt-1 font-sans text-sm text-ink/60">
        Two stretches with the live camera coach. Stand your phone up and give it a go.
      </p>

      <div className="mt-5 grid gap-2.5">
        {free.map((e) => (
          <Link key={e.slug} href={`/exercise/${e.slug}?from=try`}>
            <Card className="flex items-center gap-3 p-3.5">
              <TickDot done={done.has(e.slug)} />
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-sm font-extrabold">{e.name}</span>
                <span className="mt-0.5 block font-sans text-xs text-ink/55">{e.doseLine}</span>
              </span>
              <Pill tone="ok">Camera</Pill>
            </Card>
          </Link>
        ))}
      </div>

      <p className={`${eyebrow} mt-6 mb-2`}>With a free account</p>
      <div className="grid gap-1.5">
        {locked.map((e) => (
          <div key={e.slug} className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7EDF0] text-ink/40">
              <LockIcon />
            </span>
            <span className="flex-1 font-sans text-sm text-ink/55">{e.name}</span>
          </div>
        ))}
        <p className="text-center font-sans text-xs text-ink/45">and more across every plan</p>
      </div>

      <div className="flex-1" />

      {!profile.account && (
        <Card className="mt-6">
          <p className="font-sans text-sm font-extrabold">Keep your progress</p>
          <p className="mt-1 mb-3 font-sans text-xs text-ink/55">
            Right now it is saved on this phone only. Sign in to build a full plan.
          </p>
          <SignInButtons compact />
        </Card>
      )}
    </div>
  );
}
