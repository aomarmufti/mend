/**
 * Mend's brand mark.
 *
 * The glyph is a goniometer — the hinged protractor a physiotherapist uses to
 * measure a joint's range of motion. A pivot, a fixed reference arm, a moving
 * arm, and the swept angle between them. It is the one instrument every
 * clinician in this field already recognises, and it happens to describe
 * exactly what the camera coach does: fix a pivot on a joint and measure the
 * angle it travels through.
 *
 * Drawn on a 32-unit grid so the same geometry serves the favicon, the app
 * icon and a large header without redrawing. Strokes use `currentColor` where
 * they can, so the mark inherits whatever it sits on.
 */

interface MarkProps {
  className?: string;
  /** Pivot and swept-arc accent. Defaults to the brand amber. */
  accent?: string;
  title?: string;
}

export function LogoMark({ className, accent = "#D98A3A", title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      {/* Fixed reference arm, along the horizontal. */}
      <path
        d="M6.0 26.0H29"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Moving arm, swung up through the measured angle. */}
      <path
        d="M6.0 26.0 21.98 9.46"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* The swept angle itself — radius 9.5 from the pivot, reference arm to
          moving arm. This is the measurement, so it carries the accent. */}
      <path
        d="M15.50 26.00A9.5 9.5 0 0 0 12.60 19.17"
        stroke={accent}
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* The pivot: the tracked joint. */}
      <circle cx="6.0" cy="26.0" r="3.5" fill={accent} />
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
  accent = "#D98A3A",
  markOnly = false,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark
        accent={accent}
        className="shrink-0"
        title={markOnly ? "Mend" : undefined}
        // Inline so the mark can be sized independently of surrounding text.
        {...{ style: { width: size, height: size } }}
      />
      {!markOnly && (
        <span
          className="font-display leading-none tracking-tight"
          style={{ fontSize: size * 0.95 }}
        >
          mend
        </span>
      )}
    </span>
  );
}
