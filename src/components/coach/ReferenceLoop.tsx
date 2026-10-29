"use client";

import { useRef, useState, useSyncExternalStore } from "react";

/**
 * A looping clip of the movement done correctly, shown beside the user's own
 * camera feed while they do it.
 *
 * Filmed footage rather than a drawn figure: the point of a reference is to
 * answer "what should this look like", and a real body in a real room answers
 * that better than a stick figure can — the heel staying down, where the hands
 * go on the chair, how far forward the lean actually is.
 *
 * The clips are encoded forward-then-reversed, so the loop is seamless and the
 * user sees the movement entered and released rather than a jump cut back to
 * the start.
 */

export interface ReferenceClip {
  src: string;
  poster?: string;
  /** Short caption naming what to watch for. */
  watchFor?: string;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION).matches ?? false;
}

export function ReferenceLoop({
  clip,
  className = "",
}: {
  clip: ReferenceClip;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Someone who asked for reduced motion gets the poster frame and a play
  // button instead of a loop. Nothing in the clip is absent from the cues.
  const reduced = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    () => false,
  );

  // Starts true so the play affordance is correct before the video reports
  // itself playing; the element's own events are the source of truth after
  // that, which keeps autoplay refusals (low power mode, for one) honest
  // without an effect watching for them.
  const [paused, setPaused] = useState(true);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink ${className}`}>
      <video
        ref={videoRef}
        src={clip.src}
        poster={clip.poster}
        autoPlay={!reduced}
        loop
        muted
        playsInline
        preload="metadata"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="h-full w-full object-cover"
      />

      <span className="absolute top-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 font-sans text-[10px] font-semibold tracking-wide text-paper/90 uppercase">
        Do it like this
      </span>

      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play the reference clip" : "Pause the reference clip"}
        className="absolute inset-0 flex items-center justify-center"
      >
        {paused && (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper/85">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 translate-x-px text-pine"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        )}
      </button>

      {clip.watchFor && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-2.5 pt-6 pb-2 font-sans text-[10px] leading-snug text-paper/90">
          {clip.watchFor}
        </p>
      )}
    </div>
  );
}
