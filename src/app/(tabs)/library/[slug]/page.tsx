import Link from "next/link";
import { notFound } from "next/navigation";
import { exercises, getExerciseBySlug } from "@/data/exercises";
import { VideoEmbed } from "@/components/library/VideoEmbed";
import { CheckIcon } from "@/components/icons";

export function generateStaticParams() {
  return exercises.map((e) => ({ slug: e.slug }));
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);
  if (!exercise) notFound();

  return (
    <div className="space-y-5 px-5 pt-6">
      <Link href="/library" className="font-sans text-sm text-ink/50">
        ← Library
      </Link>

      <VideoEmbed exerciseName={exercise.name} />

      <div>
        <span className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
          {exercise.stage} stage
        </span>
        <h1 className="mt-1 font-display text-3xl">{exercise.name}</h1>
        <p className="mt-1 font-mono text-sm text-amber">{exercise.dosage}</p>
      </div>

      <div className="rounded-2xl border border-mist bg-white/60 p-4">
        <h3 className="font-sans text-sm font-semibold text-ink">Position</h3>
        <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink/70">
          {exercise.position}
        </p>
      </div>

      <div className="rounded-2xl border border-mist bg-white/60 p-4">
        <h3 className="font-sans text-sm font-semibold text-ink">Cues</h3>
        <ul className="mt-2 space-y-2">
          {exercise.cues.map((cue, i) => (
            <li key={i} className="flex items-start gap-2 font-sans text-sm text-ink/70">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              {cue}
            </li>
          ))}
        </ul>
      </div>

      {exercise.cameraCoach ? (
        <Link
          href="/coach"
          className="flex items-center justify-between rounded-2xl bg-pine px-4 py-3.5 text-paper"
        >
          <span className="font-sans text-sm font-medium">
            Try this with AI Camera Coach
          </span>
          <span className="rounded-full bg-amber px-2 py-0.5 font-sans text-[10px] font-bold tracking-wide text-ink">
            PRO
          </span>
        </Link>
      ) : (
        <p className="rounded-2xl border border-mist bg-white/40 px-4 py-3 font-sans text-xs text-ink/50">
          This is an isometric hold — there&apos;s no visible movement for the
          camera to track, so Camera Coach isn&apos;t available for it.
        </p>
      )}

      <p className="font-sans text-[11px] text-ink/40">
        Dosage transcribed from NHS Lanarkshire guidance — confirm against
        source video before clinical use.
      </p>
    </div>
  );
}
