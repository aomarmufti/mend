import { PlayIcon } from "@/components/icons";

// TODO(content): swap in real filmed footage (physiotherapist-approved,
// shot to match the NHS Lanarkshire PFPS guidance — not a re-host of their
// copyrighted videos). Pass a `src` once footage exists; until then this
// renders a clearly-labelled placeholder instead of a hand-drawn figure.
export function VideoEmbed({ exerciseName, src }: { exerciseName: string; src?: string }) {
  if (src) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-ink">
        <video
          src={src}
          loop
          muted
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pine to-ink">
      <span className="absolute top-2 left-2 rounded-full bg-paper/15 px-2 py-0.5 font-sans text-[10px] font-medium tracking-wide text-paper/80 uppercase">
        Placeholder
      </span>
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/20">
          <PlayIcon className="h-5 w-5 translate-x-px text-paper" />
        </span>
        <span className="font-sans text-xs text-paper/70">
          Watch &amp; Learn — {exerciseName}
        </span>
      </div>
    </div>
  );
}
