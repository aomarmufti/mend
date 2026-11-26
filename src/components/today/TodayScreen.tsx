"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Pill, btnPrimary, btnSecondary, eyebrow } from "@/components/ui/kit";
import { Greeting } from "@/components/today/Greeting";
import { PainCheckIn } from "@/components/today/PainCheckIn";
import { areaLowerLabel, sessionMinutes } from "@/data/catalog";
import { entitlement, reminderLabel, trialDaysLeft, useProfile } from "@/lib/profile";
import { useActivePlan } from "@/lib/usePlan";
import { setStage } from "@/lib/profile";
import { suggestStage } from "@/lib/safety";
import {
  daysSinceTrained,
  doneToday,
  painChange,
  streakDetail,
  usePainEntries,
  trainedDays,
  useAllRecords,
  useCompletedDates,
  weekStrip,
} from "@/lib/progress";
import { localDateKey } from "@/lib/exerciseLog";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

/** Screen 4. */
export function TodayScreen() {
  const profile = useProfile();
  const active = useActivePlan();
  const records = useAllRecords();
  const completed = useCompletedDates();
  const pain = usePainEntries();
  const [painOpen, setPainOpen] = useState(false);

  if (!active) return null;
  const days = trainedDays(records, completed);
  const week = weekStrip(days);
  const trainedThisWeek = week.filter((d) => d.state === "done").length;
  const { count: streak, protectedDay } = streakDetail(days);
  const away = daysSinceTrained(days);
  const change = painChange(pain);
  const trainedLast14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return localDateKey(d);
  }).filter((k) => days.has(k)).length;
  const suggestion = active.shape.staged ? suggestStage({ stage: active.plan.stage, pain, trainedLast14 }) : null;
  const done = doneToday(records);
  const usable = active.usable;
  const remaining = usable.filter((e) => !done.has(e.slug));
  const finished = usable.length > 0 && remaining.length === 0;
  const free = entitlement(profile) === "free";
  const left = trialDaysLeft(profile);
  const area = areaLowerLabel(active.shape.areaLabel);

  return (
    <div className="space-y-3 px-5 pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs text-ink/55">
            {WEEKDAY.format(new Date())} ·{" "}
            <Link href="/settings" className="font-bold underline">
              Settings
            </Link>
          </p>
          <h1 className="font-display text-[28px] leading-tight font-extrabold">
            <Greeting />
          </h1>
        </div>
        <Pill tone="soft" className="bg-white shadow-[0_4px_14px_rgba(60,100,120,0.10)]">
          {streak > 0 ? `${streak} day streak${protectedDay ? " · rest day kept" : ""}` : "Start a streak"}
        </Pill>
      </div>

      {suggestion && (
        <Card className="bg-white p-4">
          <p className="font-sans text-sm font-extrabold">
            {suggestion.kind === "step-back" ? `Go back to the ${suggestion.to} stage?` : `Ready for the ${suggestion.to} stage?`}
          </p>
          <p className="mt-1 font-sans text-xs text-ink/65">{suggestion.reason}</p>
          <button
            type="button"
            onClick={() => setStage(active.plan.conditionSlug, suggestion.to)}
            className={`${btnSecondary} mt-3 py-2 text-xs`}
          >
            {suggestion.kind === "step-back" ? "Step back a stage" : "Move up a stage"}
          </button>
        </Card>
      )}

      {away !== null && away >= 2 && (
        <Card className="bg-white p-4">
          <p className="font-sans text-sm font-extrabold">
            {away >= 7 ? "Welcome back" : `It has been ${away} days`}
          </p>
          <p className="mt-1 font-sans text-xs text-ink/65">
            A short session today is enough to get going again. There&apos;s no need to catch up.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm font-extrabold">This week</span>
          <span className="font-sans text-xs text-ink/55">
            {trainedThisWeek} {trainedThisWeek === 1 ? "day" : "days"} trained
            {change ? ` · pain ${change.delta === 0 ? "unchanged" : change.delta < 0 ? `down ${-change.delta}` : `up ${change.delta}`} since you started` : ""}
          </span>
        </div>
        <div className="mt-3 flex justify-between">
          {week.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  d.state === "done"
                    ? "bg-mint-deep text-white"
                    : d.state === "today"
                      ? "bg-white text-mint-deep ring-[2.5px] ring-mint-deep"
                      : d.state === "missed"
                        ? "bg-[#E7EDF0] text-ink/40"
                        : "bg-white/70 ring-1 ring-[#DCE6EA]"
                }`}
                aria-label={`${d.key}: ${d.state}`}
              >
                {d.state === "done" ? "✓" : ""}
              </span>
              <span className="font-sans text-[10px] font-bold text-ink/50">{d.letter}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className={eyebrow}>Today</p>
        <p className="mt-0.5 font-display text-lg font-extrabold">{active.shape.areaLabel} plan</p>
        {usable.length === 0 ? (
          <>
            <p className="font-sans text-sm text-ink/60">
              Your trial has ended, so this plan is locked. Your history is still here.
            </p>
            <Link href={`/start/plan?c=${active.plan.conditionSlug}`} className={`${btnPrimary} mt-3`}>
              See options
            </Link>
          </>
        ) : finished ? (
          <>
            <p className="font-sans text-sm text-ink/60">Done for today. Nice work.</p>
            <Link href="/session" className={`${btnSecondary} mt-3`}>
              Go again
            </Link>
          </>
        ) : (
          <>
            <p className="font-sans text-sm text-ink/60">
              {remaining.length} {remaining.length === 1 ? "exercise" : "exercises"}, about{" "}
              {sessionMinutes(remaining)} minutes
              {active.shape.staged ? ` · ${active.plan.stage} stage` : ""}
            </p>
            <Link href="/session" className={`${btnPrimary} mt-3`}>
              {remaining.length < usable.length ? "Continue session" : "Start session"}
            </Link>
          </>
        )}
        {free && usable.length > 0 && usable.length < active.session.length && (
          <p className="mt-2 font-sans text-[11px] text-ink/50">
            Free exercises only.{" "}
            <Link href={`/start/plan?c=${active.plan.conditionSlug}`} className="font-bold text-mint-deep">
              Unlock the full plan
            </Link>
          </p>
        )}
      </Card>

      {painOpen ? (
        <PainCheckIn area={area} onDone={() => setPainOpen(false)} />
      ) : (
        <button type="button" onClick={() => setPainOpen(true)} className="block w-full text-left">
          <Card className="flex items-center justify-between py-3.5">
            <span className="font-sans text-sm font-bold">How is your {area} today?</span>
            <Pill>Log</Pill>
          </Card>
        </button>
      )}

      {(profile.reminder || left !== null) && (
        <p className="pt-1 text-center font-sans text-[11px] text-ink/45">
          {profile.reminder ? `Reminder at ${reminderLabel(profile.reminder)}` : ""}
          {profile.reminder && left !== null ? " · " : ""}
          {left !== null ? (left > 0 ? `${left} days left in your trial` : "Trial ended") : ""}
        </p>
      )}
    </div>
  );
}
