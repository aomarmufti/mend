import { useId } from "react";

/**
 * Reknit's brand mark.
 *
 * It keeps the goniometer from the Mend mark — the hinged protractor a
 * physiotherapist uses to measure a joint's range of motion: a pivot, a fixed
 * reference arm and a moving arm. What changed is the swept arc. It is now a
 * thread that weaves through the joint, over the reference arm and under the
 * moving arm, the way a stitch passes through the fabric. The thread is the
 * measured angle and the knitting-back-together in one stroke.
 *
 * The over/under is done with masks, not with background-coloured halos, so
 * the mark stays transparent and sits on any surface. Drawn on a 32-unit grid
 * so the same geometry serves the favicon, the app icon and a large header.
 * Arms use `currentColor`, so the mark inherits whatever it sits on.
 *
 * Geometry (pivot at 6,26): reference arm along the horizontal, moving arm at
 * 46°, thread on a radius of 13 from -14° to 66°.
 */

/** Shared path data, so `app/icon.tsx` can draw the same mark. */
export const MARK = {
  referenceArm: "M6 26H29",
  movingArm: "M6 26 21.98 9.46",
  thread: "M18.61 29.14A13 13 0 0 0 11.29 14.12",
  /** Where the thread crosses over the reference arm: cut out of the arm. */
  threadOverGap: "M18.8 28.26A13 13 0 0 0 18.72 23.3",
  /** Where the thread passes under the moving arm: cut out of the thread. */
  threadUnderGap: "M12.94 18.81 17.12 14.49",
  gapWidth: 4.6,
  strokeWidth: 2.6,
  pivot: { cx: 6, cy: 26, r: 3.5 },
} as const;

export const BRAND_ACCENT = "#D98A3A";

interface MarkProps {
  className?: string;
  /** Thread and pivot accent. Defaults to the brand amber. */
  accent?: string;
  title?: string;
  style?: React.CSSProperties;
}

export function LogoMark({
  className,
  accent = BRAND_ACCENT,
  title,
  style,
}: MarkProps) {
  const id = useId();
  const overId = `${id}-over`;
  const underId = `${id}-under`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      <defs>
        <mask id={overId} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path d={MARK.threadOverGap} stroke="#000" strokeWidth={MARK.gapWidth} />
        </mask>
        <mask id={underId} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path d={MARK.threadUnderGap} stroke="#000" strokeWidth={MARK.gapWidth} />
        </mask>
      </defs>

      {/* Fixed reference arm — the thread passes over it. */}
      <path
        d={MARK.referenceArm}
        stroke="currentColor"
        strokeWidth={MARK.strokeWidth}
        strokeLinecap="round"
        mask={`url(#${overId})`}
      />

      {/* Moving arm, swung up through the measured angle. */}
      <path
        d={MARK.movingArm}
        stroke="currentColor"
        strokeWidth={MARK.strokeWidth}
        strokeLinecap="round"
      />

      {/* The thread: the swept angle, stitched through both arms. */}
      <path
        d={MARK.thread}
        stroke={accent}
        strokeWidth={MARK.strokeWidth}
        strokeLinecap="round"
        mask={`url(#${underId})`}
      />

      {/* The pivot: the tracked joint. */}
      <circle {...MARK.pivot} fill={accent} />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Mark size in px. The wordmark scales with it. */
  size?: number;
  accent?: string;
  /** Hide the wordmark and show the mark alone. */
  markOnly?: boolean;
}

export function Logo({
  className = "",
  size = 28,
  accent = BRAND_ACCENT,
  markOnly = false,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark
        accent={accent}
        className="shrink-0"
        title={markOnly ? "Reknit" : undefined}
        style={{ width: size, height: size }}
      />
      {!markOnly && (
        <span
          className="font-display leading-none tracking-tight"
          style={{ fontSize: size * 0.95 }}
        >
          {/* The prefix is set lighter: re- is the return, knit is the work. */}
          <span style={{ fontWeight: 500 }}>re</span>knit
        </span>
      )}
    </span>
  );
}
