"use client";

import { useRouter } from "next/navigation";
import type { Condition } from "@/data/conditions";
import { writeActiveCondition } from "@/lib/activeCondition";

export function ConditionPicker({ conditions }: { conditions: Condition[] }) {
  const router = useRouter();

  const choose = (condition: Condition) => {
    writeActiveCondition(condition.slug);
    // Conditions without a sourced programme have nothing to run yet, so send
    // them to the library, which explains that, rather than to an empty Today.
    router.push(condition.programme ? "/today" : "/library");
  };

  return (
    <div className="mt-6 space-y-2.5">
      {conditions.map((condition) => (
        <button
          key={condition.slug}
          type="button"
          onClick={() => choose(condition)}
          className="w-full rounded-2xl border border-mist bg-white/60 p-4 text-left transition hover:border-moss hover:bg-white"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-sans text-sm font-semibold text-ink">
                {condition.name}
              </p>
              {condition.alsoKnownAs && (
                <p className="mt-0.5 font-sans text-xs text-ink/45">
                  {condition.alsoKnownAs}
                </p>
              )}
            </div>
            {condition.programme ? (
              <span className="shrink-0 rounded-full bg-moss/15 px-2 py-0.5 font-sans text-[10px] font-semibold text-moss">
                Programme ready
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 font-sans text-[10px] font-semibold text-ink/50">
                In development
              </span>
            )}
          </div>
          <p className="mt-2 font-sans text-xs leading-relaxed text-ink/60">
            {condition.summary}
          </p>
        </button>
      ))}
    </div>
  );
}
