import Link from "next/link";
import { bodyAreas, areaHasProgramme } from "@/data/conditions";

export default function StartPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pt-12 pb-10">
      <p className="font-sans text-xs font-semibold tracking-wide text-moss uppercase">
        Getting started
      </p>
      <h1 className="mt-1 font-display text-3xl">Where does it hurt?</h1>
      <p className="mt-2 font-sans text-sm text-ink/60">
        Pick the area, then the specific problem. Your programme and the camera
        coach are built around that diagnosis, not a generic routine.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {bodyAreas.map((area) => (
          <Link
            key={area.slug}
            href={`/start/${area.slug}`}
            className="flex flex-col rounded-2xl border border-mist bg-white/60 p-4 transition hover:border-moss hover:bg-white"
          >
            <span className="text-2xl" aria-hidden="true">
              {area.icon}
            </span>
            <span className="mt-2 font-sans text-sm font-semibold text-ink">
              {area.label}
            </span>
            <span className="mt-1 font-sans text-xs leading-snug text-ink/50">
              {area.blurb}
            </span>
            {areaHasProgramme(area.slug) && (
              <span className="mt-2 self-start rounded-full bg-moss/15 px-2 py-0.5 font-sans text-[10px] font-semibold text-moss">
                Programme ready
              </span>
            )}
          </Link>
        ))}
      </div>

      <p className="mt-6 font-sans text-[11px] leading-relaxed text-ink/40">
        Mend is a self-management aid, not a diagnosis. If you do not know what
        is wrong, or your pain followed a significant injury, see a clinician
        before starting any programme.
      </p>
    </div>
  );
}
