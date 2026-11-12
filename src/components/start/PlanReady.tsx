"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill, ProgressBar, btnPrimary, eyebrow } from "@/components/ui/kit";
import { SignInButtons } from "@/components/flow/SignInButtons";
import { planFor, sessionFor, sessionMinutes } from "@/data/catalog";
import {
  TRIAL_DAYS,
  addPlan,
  entitlement,
  setReminder,
  startTrial,
  trialDaysLeft,
  useProfile,
} from "@/lib/profile";

/** Setup step 4: the plan, a reminder time, then the trial. */
export function PlanReady({ conditionSlug, adding }: { conditionSlug: string; adding: boolean }) {
  const router = useRouter();
  const profile = useProfile();
  const plan = planFor(conditionSlug)!;
  const [time, setTime] = useState(profile.reminder ?? "08:00");
  const [restoreNote, setRestoreNote] = useState(false);
  const full = entitlement(profile) === "full";
  const trialUsed = profile.trialStartedAt !== null;
  const left = trialDaysLeft(profile);

  const exerciseCount = plan.staged
    ? plan.stages.reduce((n, s) => n + s.exercises.length, 0)
    : plan.stretches.length;
  const minutes = sessionMinutes(sessionFor(plan, "Early"));

  const finish = (withTrial: boolean) => {
    setReminder(time || null);
    if (withTrial) startTrial();
    addPlan(conditionSlug);
    router.push("/today");
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <ProgressBar pct={100} className="mt-1 mb-4" />
      <p className={eyebrow}>Your plan is ready</p>

      <Card className="mt-2">
        <p className="font-display text-lg font-extrabold">{plan.areaLabel}</p>
        <p className="font-sans text-sm text-ink/60">{plan.condition.name}</p>
        <div className="mt-3 flex justify-between font-sans text-xs font-semibold text-ink/70">
          {plan.staged ? <span>3 stages</span> : <span>Stretches</span>}
          <span>{exerciseCount} exercises</span>
          <span>{minutes} min a day</span>
        </div>
        {!plan.staged && (
          <p className="mt-3 rounded-xl bg-chip px-3 py-2 font-sans text-[11px] leading-relaxed text-ink/60">
            No clinically sourced programme exists for this condition in Reknit yet, so this plan is
            general mobility work for the area, not a prescription.
          </p>
        )}
      </Card>

      <Card className="mt-2.5 flex items-center justify-between py-3">
        <label htmlFor="reminder" className="font-sans text-sm font-bold">
          Remind me at
        </label>
        <input
          id="reminder"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-full bg-chip px-3 py-1.5 font-sans text-sm font-bold text-ink/70"
        />
      </Card>

      {!profile.account ? (
        <Card className="mt-2.5">
          <p className="font-sans text-sm font-extrabold">Sign in to save your plan</p>
          <p className="mt-1 mb-3 font-sans text-xs text-ink/55">
            Then try every plan free for {TRIAL_DAYS} days.
          </p>
          <SignInButtons compact next={`/start/plan?c=${conditionSlug}${adding ? "&add=1" : ""}`} />
        </Card>
      ) : full ? (
        <Card className="mt-2.5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm font-extrabold">Included in your trial</p>
            <Pill tone="ok">{left} days left</Pill>
          </div>
          <p className="mt-1 font-sans text-xs text-ink/55">Every plan and live camera coaching.</p>
        </Card>
      ) : (
        <Card className="mt-2.5 bg-white">
          <p className="font-sans text-sm font-extrabold">
            {trialUsed ? "Your free trial has ended" : `Try it free for ${TRIAL_DAYS} days`}
          </p>
          <p className="mt-1 mb-2 font-sans text-xs leading-relaxed text-ink/60">
            Every plan, live camera coaching and your full progress history.
          </p>
          <p className="font-sans text-[11px] leading-relaxed text-ink/50">
            Then [price to be set] a month.
            <br />
            Cancel any time. 12 week guarantee, see terms.
          </p>
        </Card>
      )}

      <div className="flex-1" />

      {profile.account &&
        (full ? (
          <button type="button" onClick={() => finish(false)} className={`${btnPrimary} mt-6`}>
            {adding ? "Add to my plans" : "Go to today"}
          </button>
        ) : trialUsed ? (
          <button type="button" onClick={() => finish(false)} className={`${btnPrimary} mt-6`}>
            Continue with the free exercises
          </button>
        ) : (
          <button type="button" onClick={() => finish(true)} className={`${btnPrimary} mt-6`}>
            Start free trial
          </button>
        ))}
      {profile.account && !full && (
        <button
          type="button"
          onClick={() => setRestoreNote(true)}
          className="mt-3 font-sans text-xs font-semibold text-ink/50"
        >
          {restoreNote ? "No previous purchase found for this account." : "Restore purchase"}
        </button>
      )}
    </div>
  );
}
