"use client";

import { useState } from "react";
import { Card, eyebrow } from "@/components/ui/kit";
import { sessionMinutes } from "@/data/catalog";
import { stageOrder } from "@/data/exercises";
import { localDateKey } from "@/lib/exerciseLog";
import { reminderLabel, setReminder, useProfile } from "@/lib/profile";
import { streakDetail, trainedDays, useAllRecords, useCompletedDates, usePainEntries } from "@/lib/progress";
import { nextMilestone } from "@/lib/milestones";
import { MOVE_UP_DAYS, MOVE_UP_PAIN_MAX, stageReadiness } from "@/lib/safety";
import type { ActivePlan } from "@/lib/usePlan";

function useTrainedLast14(): number {
  const days = trainedDays(useAllRecords(), useCompletedDates());
  let n = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(localDateKey(d))) n += 1;
  }
  return n;
}

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${
        ok ? "bg-mint-deep text-white" : "bg-chip text-ink/40"
      }`}
      aria-hidden="true"
    >
      {ok ? "✓" : ""}
    </span>
  );
}

/**
 * The "what happens next" part of the story: tomorrow's session, a reminder that
 * really reaches the phone's calendar, and for a staged programme the road ahead
 * and what it takes to move up. Shown once today's session is done.
 */
export function NextUp({ active }: { active: ActivePlan }) {
  const profile = useProfile();
  const pain = usePainEntries();
  const trained = useTrainedLast14();
  const streak = streakDetail(trainedDays(useAllRecords(), useCompletedDates())).count;
  const goal = nextMilestone(streak);
  const [time, setTime] = useState(profile.reminder ?? "08:00");
  const { shape, plan, usable } = active;
  const minutes = sessionMinutes(usable);
  const stageIndex = stageOrder.indexOf(plan.stage);
  const nextStage = shape.staged ? stageOrder[stageIndex + 1] : undefined;
  const nextExercises = nextStage ? shape.stages[stageIndex + 1]?.exercises ?? [] : [];
  const readiness = stageReadiness({ pain, trainedLast14: trained });

  const reminderTime = profile.reminder ?? time;
  const icsHref = `/api/reminder?time=${encodeURIComponent(reminderTime)}&label=${encodeURIComponent(shape.areaLabel)}&mins=${minutes}&d=${localDateKey(new Date())}`;

  return (
    <div className="space-y-3">
      <Card>
        <p className={eyebrow}>Tomorrow</p>
        <p className="mt-0.5 font-display text-lg font-extrabold">Same time, same plan</p>
        {streak > 0 && goal && (
          <p className="mt-1 font-sans text-xs font-bold text-mint-deep">
            Tomorrow is day {streak + 1}.{" "}
            {goal.away === 1 ? `One more day reaches ${goal.days} in a row.` : `${goal.away} more days reaches ${goal.days} in a row.`}
          </p>
        )}
        <p className="mt-1 font-sans text-sm text-ink/60">
          {usable.length} {usable.length === 1 ? "exercise" : "exercises"}, about {minutes} minutes
          {shape.staged ? ` · ${plan.stage} stage` : ""}
        </p>
        <ul className="mt-2 space-y-0.5 font-sans text-xs text-ink/60">
          {usable.map((e) => (
            <li key={e.slug}>{e.name}</li>
          ))}
        </ul>

        <div className="mt-3 border-t border-[#E3ECEF] pt-3">
          {profile.reminder ? (
            <p className="font-sans text-xs font-bold">Daily reminder: {reminderLabel(profile.reminder)}</p>
          ) : (
            <label className="flex items-center justify-between font-sans text-xs font-bold">
              Remind me at
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-full bg-chip px-3 py-1.5 font-sans text-xs"
              />
            </label>
          )}
          <a
            href={icsHref}
            onClick={() => {
              if (!profile.reminder && time) setReminder(time);
            }}
            className="mt-2 block rounded-full bg-chip py-2.5 text-center font-sans text-xs font-extrabold text-mint-deep"
          >
            Add a daily reminder to your calendar
          </a>
          <p className="mt-1.5 font-sans text-[11px] text-ink/45">
            Opens your calendar with a daily event that repeats and alerts you at {reminderLabel(reminderTime)}.
          </p>
        </div>
      </Card>

      {shape.staged && (
        <Card>
          <p className={eyebrow}>Where this is going</p>
          <div className="mt-2 flex gap-1.5">
            {stageOrder.map((s, i) => (
              <span
                key={s}
                className={`flex-1 rounded-full py-1.5 text-center font-sans text-[11px] font-extrabold ${
                  i === stageIndex
                    ? "bg-mint-deep text-white"
                    : i < stageIndex
                      ? "bg-success-soft text-success"
                      : "bg-chip text-ink/50"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          {nextStage ? (
            <>
              <p className="mt-3 font-sans text-sm font-extrabold">Next: {nextStage} stage</p>
              {nextExercises.length > 0 && (
                <p className="mt-0.5 font-sans text-xs text-ink/60">{nextExercises.map((e) => e.name).join(", ")}</p>
              )}
              <p className="mt-3 font-sans text-xs font-bold">What we look for before suggesting it</p>
              <ul className="mt-1.5 space-y-1.5 font-sans text-xs text-ink/70">
                <li className="flex gap-2">
                  <Check ok={readiness.painOk} />
                  <span>
                    Pain of {MOVE_UP_PAIN_MAX} or less on your last 3 check-ins
                    {readiness.lastPain.length > 0 ? ` (yours: ${readiness.lastPain.join(", ")})` : " (no check-ins yet)"}
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check ok={readiness.daysOk} />
                  <span>
                    Training on {MOVE_UP_DAYS} of the last 14 days (you&apos;re at {trained})
                  </span>
                </li>
              </ul>
              <p className="mt-2 font-sans text-[11px] text-ink/45">
                You can also move on yourself in the Plan tab when these exercises feel easy and pain-free.
              </p>
            </>
          ) : (
            <p className="mt-3 font-sans text-xs text-ink/60">
              This is the final stage before returning to full activity. Keep it daily.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

