"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Pill, ProgressBar, btnSecondary, eyebrow } from "@/components/ui/kit";
import { ExerciseRow } from "@/components/plan/ExerciseRow";
import { planFor } from "@/data/catalog";
import { stageDescription, stageOrder } from "@/data/exercises";
import {
  advanceStage,
  canUse,
  entitlement,
  removePlan,
  selectPlan,
  setStage,
  signOut,
  trialDaysLeft,
  useProfile,
} from "@/lib/profile";
import { useActivePlan } from "@/lib/usePlan";
import { doneToday, useAllRecords } from "@/lib/progress";

/** Screen 5. */
export function PlanScreen() {
  const profile = useProfile();
  const active = useActivePlan();
  const done = doneToday(useAllRecords());
  const [showEarlier, setShowEarlier] = useState(false);
  if (!active) return null;

  const { shape, plan } = active;
  const stageIndex = stageOrder.indexOf(plan.stage);
  const current = shape.stages[stageIndex];
  const nextStage = stageOrder[stageIndex + 1];
  const doneInStage = current ? current.exercises.filter((e) => done.has(e.slug)).length : 0;
  const locked = (slug: string) => !canUse(profile, slug);
  const free = entitlement(profile) === "free";
  const left = trialDaysLeft(profile);

  return (
    <div className="space-y-3 px-5 pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-extrabold">Plan</h1>
        <Link href="/start?add=1">
          <Pill>+ Add plan</Pill>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {profile.plans.map((p) => {
          const s = planFor(p.conditionSlug);
          const on = p.conditionSlug === plan.conditionSlug;
          return (
            <button
              key={p.conditionSlug}
              type="button"
              onClick={() => selectPlan(p.conditionSlug)}
              aria-pressed={on}
              className={`rounded-full px-4 py-1.5 font-sans text-xs font-bold ${
                on ? "bg-mint-deep text-white" : "bg-chip text-ink/60"
              }`}
            >
              {s?.areaLabel ?? p.conditionSlug}
            </button>
          );
        })}
      </div>
      <p className="font-sans text-xs text-ink/55">{shape.condition.name}</p>

      {shape.staged && current ? (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-extrabold">{plan.stage} stage</span>
              <span className="font-sans text-xs text-ink/55">
                {stageIndex + 1} of {stageOrder.length}
              </span>
            </div>
            <ProgressBar pct={(doneInStage / current.exercises.length) * 100} className="mt-2.5" />
            <p className="mt-2 font-sans text-xs leading-relaxed text-ink/55">
              {doneInStage}/{current.exercises.length} done today. {stageDescription[plan.stage]}
            </p>
          </Card>

          <div className="flex flex-col gap-2">
            {current.exercises.map((e) => (
              <ExerciseRow key={e.slug} exercise={e} done={done.has(e.slug)} locked={locked(e.slug)} />
            ))}
          </div>

          {nextStage ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Move on to the ${nextStage} stage? Do this when the ${plan.stage} exercises feel easy and pain-free.`))
                  advanceStage(plan.conditionSlug);
              }}
              className={`${btnSecondary} py-3 text-xs`}
            >
              These feel easy, move to the {nextStage} stage
            </button>
          ) : (
            <p className="text-center font-sans text-xs text-ink/55">
              This is the final stage before returning to full activity.
            </p>
          )}
          {nextStage && (
            <p className="text-center font-sans text-xs text-ink/45">
              {stageOrder.slice(stageIndex + 1).join(" and ")} {stageIndex + 1 < 2 ? "stages unlock" : "stage unlocks"} as you progress
            </p>
          )}

          {stageIndex > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowEarlier((v) => !v)}
                className="font-sans text-xs font-bold text-mint-deep"
              >
                {showEarlier ? "Hide" : "Show"} earlier stages
              </button>
              {showEarlier &&
                shape.stages.slice(0, stageIndex).map((s) => (
                  <div key={s.stage} className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className={eyebrow}>{s.stage} stage</p>
                      <button
                        type="button"
                        onClick={() => setStage(plan.conditionSlug, s.stage)}
                        className="font-sans text-[11px] font-bold text-ink/50"
                      >
                        Go back to this stage
                      </button>
                    </div>
                    {s.exercises.map((e) => (
                      <ExerciseRow key={e.slug} exercise={e} done={done.has(e.slug)} locked={locked(e.slug)} />
                    ))}
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <p className="font-sans text-sm font-extrabold">General mobility work</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-ink/60">
            Mend only prescribes programmes transcribed from a clinical source, and this condition
            does not have one yet. These stretches are relevant to the area and the camera can
            check your form on them, but they are not a prescription.
          </p>
        </Card>
      )}

      {shape.stretches.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <p className={eyebrow}>{shape.staged ? "Stretches" : "Your stretches"}</p>
          {shape.stretches.map((e) => (
            <ExerciseRow key={e.slug} exercise={e} done={done.has(e.slug)} locked={locked(e.slug)} />
          ))}
        </div>
      )}

      {free && (
        <Card className="mt-2" >
          <div id="unlock" className="font-sans text-sm font-extrabold">Unlock the full plan</div>
          <p className="mt-1 font-sans text-xs text-ink/55">
            {profile.account ? "Every exercise, every plan, with live camera coaching." : "Sign in to build your plan and start a free trial."}
          </p>
          <Link href={`/start/plan?c=${plan.conditionSlug}`} className="mt-2 inline-block font-sans text-xs font-bold text-mint-deep">
            See options →
          </Link>
        </Card>
      )}

      <div className="space-y-1 pt-4 pb-2 text-center font-sans text-[11px] text-ink/45">
        {profile.plans.length > 1 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Remove the ${shape.areaLabel} plan? Your history stays.`)) removePlan(plan.conditionSlug);
            }}
            className="block w-full font-bold"
          >
            Remove this plan
          </button>
        )}
        <p>
          {profile.account
            ? `Signed in with ${profile.account.provider === "apple" ? "Apple" : "Google"}`
            : "Not signed in"}
          {left !== null ? ` · ${left > 0 ? `${left} trial days left` : "trial ended"}` : ""}
          {" · "}
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Sign out and clear this phone's plan? Your exercise history stays on this phone.")) {
                signOut();
                window.location.href = "/welcome";
              }
            }}
            className="font-bold underline"
          >
            {profile.account ? "Sign out" : "Start over"}
          </button>
        </p>
        <p>Programme from NHS Lanarkshire PFPS guidance. Confirm against the source before clinical use.</p>
      </div>
    </div>
  );
}
