"use client";

import Link from "next/link";
import { usePlans, setActivePlan, removePlan } from "@/lib/plans";
import { getArea, getCondition } from "@/data/conditions";

/** Switch between the user's plans (e.g. Knee, Shoulder) or add another. */
export function PlanChips() {
  const { plans, activeId } = usePlans();

  const labelFor = (conditionSlug: string, all: string[]) => {
    const c = getCondition(conditionSlug);
    const area = getArea(c?.areaSlug)?.label ?? c?.name ?? "Plan";
    // Two plans in one area (e.g. PFPS and ACL) need the condition to tell apart.
    const dupes = all.filter((s) => getCondition(s)?.areaSlug === c?.areaSlug).length > 1;
    return dupes && c ? c.name : area;
  };
  const slugs = plans.map((p) => p.conditionSlug);

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Your plans">
        {plans.map((p) => {
          const on = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActivePlan(p.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 font-sans text-sm font-semibold transition ${
                on ? "bg-success-soft text-success" : "bg-chip text-ink/60"
              }`}
            >
              {labelFor(p.conditionSlug, slugs)}
            </button>
          );
        })}
        <Link
          href="/start"
          className="flex min-h-11 shrink-0 items-center rounded-full border border-dashed border-ink/25 px-4 font-sans text-sm font-semibold text-ink/60"
        >
          + Add a plan
        </Link>
      </div>
      {plans.length > 1 && activeId && (
        <button
          type="button"
          onClick={() => removePlan(activeId)}
          className="mt-1 font-sans text-xs text-ink/40 underline"
        >
          Remove this plan
        </button>
      )}
    </div>
  );
}
