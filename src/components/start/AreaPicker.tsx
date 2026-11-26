"use client";

import Link from "next/link";
import { bodyAreas, conditionsForArea, type BodyArea } from "@/data/conditions";
import { conditionIsReady } from "@/data/catalog";
import { Card, Pill } from "@/components/ui/kit";
import { SetupHeader } from "@/components/flow/SetupHeader";
import { toggleNotifyArea, useProfile } from "@/lib/profile";

type AreaStatus = "programme" | "stretches" | "soon";

function statusOf(area: BodyArea): AreaStatus {
  const list = conditionsForArea(area.slug);
  if (list.some((c) => c.programme)) return "programme";
  if (list.some(conditionIsReady)) return "stretches";
  return "soon";
}

const LABEL: Record<AreaStatus, string> = {
  programme: "Programme ready",
  stretches: "Stretches ready",
  soon: "Coming soon",
};

/** Setup step 1: where does it hurt. */
export function AreaPicker({ adding }: { adding: boolean }) {
  const profile = useProfile();
  const q = adding ? "?add=1" : "";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8">
      <SetupHeader
        step={1}
        back={adding ? "/plan" : profile.account ? undefined : "/welcome"}
        title="Where does it hurt?"
        subtitle="Your plan is built around this."
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {bodyAreas.map((area) => {
          const status = statusOf(area);
          const notified = profile.notifyAreas.includes(area.slug);
          const inner = (
            <Card className="h-full p-3.5 text-left">
              <span className="text-xl" aria-hidden="true">
                {area.icon}
              </span>
              <span className="mt-1 block font-sans text-sm font-extrabold">{area.label}</span>
              <Pill tone={status === "soon" ? "soft" : "ok"} className="mt-2 text-[10px]">
                {status === "soon" && notified ? "We'll tell you ✓" : LABEL[status]}
              </Pill>
            </Card>
          );
          return status === "soon" ? (
            <button
              key={area.slug}
              type="button"
              onClick={() => toggleNotifyArea(area.slug)}
              aria-pressed={notified}
            >
              {inner}
            </button>
          ) : (
            <Link key={area.slug} href={`/start/${area.slug}${q}`}>
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />
      <p className="mt-6 text-center font-sans text-xs leading-relaxed text-ink/50">
        Not listed yet? Tap a coming-soon area and we will tell you when it is ready.
      </p>
      <p className="mt-3 text-center font-sans text-[11px] leading-relaxed text-ink/40">
        Reknit is a self-management aid, not a diagnosis. If your pain followed a significant injury,
        see a clinician first.
      </p>
    </div>
  );
}
