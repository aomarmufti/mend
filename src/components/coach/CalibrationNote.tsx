import type { Calibration } from "@/data/coachedExercises";

/**
 * States how the thresholds behind a camera check were arrived at.
 *
 * The app's one standing rule is that it does not present a guess as a
 * measurement. A camera check derived from a number in a protocol is useful,
 * and it is not the same thing as one measured off footage of the movement —
 * so the screen says which it is rather than letting the live overlay imply
 * a precision that has not been established.
 */
export function CalibrationNote({
  calibration,
  provenance,
}: {
  calibration: Calibration;
  provenance: string;
}) {
  const filmed = calibration === "filmed";

  return (
    <div className="rounded-xl border border-mist bg-white/50 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${filmed ? "bg-moss" : "bg-amber"}`}
        />
        <p className="font-sans text-[11px] font-semibold tracking-wide text-ink/55 uppercase">
          {filmed ? "Calibrated from footage" : "Not yet calibrated from footage"}
        </p>
      </div>
      <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink/60">
        {provenance}
      </p>
    </div>
  );
}
