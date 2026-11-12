"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Pill, btnPrimary, eyebrow } from "@/components/ui/kit";
import { MODE_LABEL, type CatalogExercise } from "@/data/catalog";
import { ReferenceLoop } from "@/components/coach/ReferenceLoop";
import { ReferenceFigure } from "@/components/coach/ReferenceFigure";
import { VideoEmbed } from "@/components/library/VideoEmbed";
import { CalibrationNote } from "@/components/coach/CalibrationNote";

/**
 * Screen 6: an exercise explains itself before the camera opens. Used on its
 * own from Plan and the free preview, and as each step of a session.
 */
export function ExerciseIntro({
  exercise,
  back,
  header,
  locked = false,
  unlockHref = "/plan",
  onCamera,
  onManual,
  manualLabel,
}: {
  exercise: CatalogExercise;
  back?: { href: string; label: string } | { onClick: () => void; label: string };
  /** Extra line above the title (session progress). */
  header?: ReactNode;
  locked?: boolean;
  unlockHref?: string;
  onCamera: () => void;
  onManual: () => void;
  manualLabel?: string;
}) {
  const camera = exercise.mode === "camera";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {back &&
        ("href" in back ? (
          <Link href={back.href} className="font-sans text-sm font-semibold text-ink/50">
            ← {back.label}
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} className="self-start font-sans text-sm font-semibold text-ink/50">
            ← {back.label}
          </button>
        ))}
      {header}

      <div className="mt-3">
        {exercise.reference ? (
          <ReferenceLoop clip={exercise.reference} className="aspect-[4/3] w-full rounded-[22px]" />
        ) : exercise.slug === "heel-slides" ? (
          <ReferenceFigure />
        ) : (
          <VideoEmbed exerciseName={exercise.name} />
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          {exercise.stage && <p className={eyebrow}>{exercise.stage} stage</p>}
          <h1 className="font-display text-2xl leading-tight font-extrabold">{exercise.name}</h1>
          <p className="mt-0.5 font-sans text-sm text-ink/60">{exercise.doseLine}</p>
        </div>
        <Pill tone={camera ? "ok" : "soft"} className="mt-1 text-[10px]">
          {MODE_LABEL[exercise.mode]}
        </Pill>
      </div>

      <Card className="mt-3 p-3.5">
        <p className="mb-1.5 font-sans text-xs font-extrabold">What you do</p>
        <ol className="space-y-1 font-sans text-sm leading-relaxed text-ink/75">
          {exercise.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-mint-deep">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-2.5 p-3.5">
        <p className="mb-1 font-sans text-xs font-extrabold">Watch for</p>
        <ul className="space-y-1 font-sans text-[13px] leading-relaxed text-ink/70">
          {exercise.cues.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      </Card>

      {camera ? (
        <Card className="mt-2.5 p-3.5">
          <p className="font-sans text-[13px] leading-relaxed">
            <b>Camera setup:</b> {exercise.setup} Prop your phone up about 2 metres away.
          </p>
          {exercise.calibration && exercise.provenance && (
            <div className="mt-2.5">
              <CalibrationNote calibration={exercise.calibration} provenance={exercise.provenance} />
            </div>
          )}
        </Card>
      ) : (
        exercise.noCameraReason && (
          <p className="mt-2.5 rounded-2xl bg-white/60 px-3.5 py-3 font-sans text-xs leading-relaxed text-ink/55">
            <b>No camera check.</b> {exercise.noCameraReason}
          </p>
        )
      )}

      <div className="min-h-6 flex-1" />

      {locked ? (
        <Link href={unlockHref} className={btnPrimary}>
          Unlock with a free trial
        </Link>
      ) : camera ? (
        <>
          <button type="button" onClick={onCamera} className={btnPrimary}>
            Start with the camera
          </button>
          <button type="button" onClick={onManual} className="mt-3 font-sans text-xs font-bold text-ink/55">
            {manualLabel ?? "Do it without the camera"}
          </button>
        </>
      ) : (
        <button type="button" onClick={onManual} className={btnPrimary}>
          {exercise.manual.kind === "hold" || exercise.manual.holdSec ? "Start the hold timer" : "Start"}
        </button>
      )}
    </div>
  );
}
