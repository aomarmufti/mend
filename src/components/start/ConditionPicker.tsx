"use client";

import { useRouter } from "next/navigation";
import type { Condition } from "@/data/conditions";
import { conditionIsReady } from "@/data/catalog";
import { Card, Pill } from "@/components/ui/kit";
import { toggleNotifyArea, useProfile } from "@/lib/profile";

/** Setup step 2. A condition with nothing to offer yet is shown, not hidden, and cannot be chosen. */
export function ConditionPicker({ conditions, adding }: { conditions: Condition[]; adding: boolean }) {
  const router = useRouter();
  const profile = useProfile();

  return (
    <div className="mt-5 space-y-2.5">
      {conditions.map((condition) => {
        const ready = conditionIsReady(condition);
        const key = `condition:${condition.slug}`;
        const notified = profile.notifyAreas.includes(key);
        return (
          <button
            key={condition.slug}
            type="button"
            onClick={() =>
              ready
                ? router.push(`/start/pain?c=${condition.slug}${adding ? "&add=1" : ""}`)
                : toggleNotifyArea(key)
            }
            className="block w-full text-left"
          >
            <Card className={ready ? "" : "opacity-75"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-sm font-extrabold">{condition.name}</p>
                  {condition.alsoKnownAs && (
                    <p className="mt-0.5 font-sans text-xs text-ink/45">{condition.alsoKnownAs}</p>
                  )}
                </div>
                <Pill tone={ready ? "ok" : "soft"} className="text-[10px]">
                  {condition.programme
                    ? "Programme ready"
                    : ready
                      ? "Stretches ready"
                      : notified
                        ? "We'll tell you ✓"
                        : "Coming soon"}
                </Pill>
              </div>
              <p className="mt-2 font-sans text-xs leading-relaxed text-ink/60">{condition.summary}</p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
