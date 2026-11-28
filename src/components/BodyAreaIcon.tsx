type Props = { slug: string; className?: string };

/**
 * Icons for the body areas, drawn on one 48-unit grid as a set: the limb or
 * region in a soft tint, and the joint as a ring in the full colour, the way a
 * physio marks where it hurts. Colour comes from `currentColor`.
 */
export function BodyAreaIcon({ slug, className = "h-9 w-9" }: Props) {
  const soft = { stroke: "currentColor", strokeOpacity: 0.3, strokeWidth: 9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const ring = { stroke: "currentColor", strokeWidth: 2.6, fill: "#fff" };
  const dot = { fill: "currentColor" };

  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {children}
    </svg>
  );

  switch (slug) {
    case "knee":
      return svg(
        <>
          <path d="M19 6 25 24 20 42" {...soft} />
          <circle cx="25" cy="24" r="6.5" {...ring} />
          <circle cx="25" cy="24" r="2" {...dot} />
        </>,
      );
    case "hip":
      return svg(
        <>
          <path d="M8 11q16 16 32 0" {...soft} />
          <path d="M14 19 12 43M34 19l2 24" {...soft} />
          <circle cx="14" cy="20" r="6.5" {...ring} />
          <circle cx="14" cy="20" r="2" {...dot} />
        </>,
      );
    case "foot":
      return svg(
        <>
          <path d="M17 5v26" {...soft} />
          <path d="M17 31v8h20" {...soft} />
          <circle cx="17" cy="31" r="6.5" {...ring} />
          <circle cx="17" cy="31" r="2" {...dot} />
        </>,
      );
    case "shoulder":
      return svg(
        <>
          <circle cx="24" cy="7" r="4" fill="currentColor" fillOpacity="0.3" />
          <path d="M7 22Q24 8 41 22" {...soft} />
          <path d="M9 25 8 44M39 25l1 19" {...soft} />
          <circle cx="39" cy="23" r="6.5" {...ring} />
          <circle cx="39" cy="23" r="2" {...dot} />
        </>,
      );
    case "elbow":
      return svg(
        <>
          <path d="M9 10 24 35 40 12" {...soft} />
          <circle cx="24" cy="34" r="6.5" {...ring} />
          <circle cx="24" cy="34" r="2" {...dot} />
        </>,
      );
    case "back":
      return svg(
        <>
          <rect x="16" y="3.5" width="16" height="7.5" rx="3.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" fill="currentColor" fillOpacity="0.14" />
          <rect x="14.5" y="13" width="17" height="7.5" rx="3.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" fill="currentColor" fillOpacity="0.14" />
          <rect x="14.5" y="22.5" width="17" height="7.5" rx="3.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" fill="currentColor" fillOpacity="0.14" />
          <rect x="16" y="32" width="16" height="7.5" rx="3.5" {...ring} />
          <circle cx="24" cy="35.75" r="2" {...dot} />
          <path d="M20 43.5h8" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
        </>,
      );
    default:
      return svg(<circle cx="24" cy="24" r="6.5" {...ring} />);
  }
}
