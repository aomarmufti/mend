"use client";

import { useState } from "react";
import { Card, Pill, eyebrow } from "@/components/ui/kit";
import { localDateKey, summarise, type ExerciseRecord } from "@/lib/exerciseLog";
import {
  bestHoldMs,
  counts,
  formatHold,
  monthGrid,
  painChange,
  trainedDays,
  useAllRecords,
  useCompletedDates,
  usePainEntries,
  weekStrip,
} from "@/lib/progress";
import { useActivePlan } from "@/lib/usePlan";

type View = "week" | "month" | "all";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Screen 9. Everything here comes from the user's own logs. */
export function ProgressScreen() {
  const records = useAllRecords();
  const completed = useCompletedDates();
  const pain = usePainEntries();
  const active = useActivePlan();
  const today = new Date();
  const todayKey = localDateKey(today);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const days = trainedDays(records, completed);
  const thisMonth = [...days].filter((k) => k.startsWith(todayKey.slice(0, 7))).length;
  const change = painChange(pain);
  const best = bestHoldMs(records);
  const summary = summarise(records.filter(counts));

  const weekAnchor = new Date(today);
  weekAnchor.setDate(today.getDate() + weekOffset * 7);
  const week = weekStrip(days, weekAnchor).map((d) =>
    d.key > todayKey ? { ...d, state: "upcoming" as const } : d.key < todayKey && d.state === "today" ? { ...d, state: "missed" as const } : d,
  );

  const months = (() => {
    const all = [...days].sort();
    const first = all[0] ? parseKey(all[0]) : today;
    const list: { y: number; m: number; n: number }[] = [];
    const c = new Date(today.getFullYear(), today.getMonth(), 1);
    const stop = new Date(first.getFullYear(), first.getMonth(), 1);
    while (c >= stop) {
      const prefix = localDateKey(c).slice(0, 7);
      list.push({ y: c.getFullYear(), m: c.getMonth(), n: all.filter((k) => k.startsWith(prefix)).length });
      c.setMonth(c.getMonth() - 1);
    }
    return list;
  })();

  const dayRecords = selected ? records.filter((r) => r.date === selected && counts(r)) : [];
  const atCurrentMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();

  const share = async () => {
    const area = active?.shape.condition.name ?? "Rehab";
    const lines = [
      `Reknit progress: ${area}`,
      `Days trained: ${days.size} (${thisMonth} this month)`,
      change ? `Pain: ${change.start}/10 at the start, ${change.now}/10 now` : "Pain: not enough check-ins yet",
      best ? `Best hold: ${formatHold(best)}` : null,
      summary.avgScore !== null ? `Average camera form score: ${summary.avgScore}` : null,
      "",
      ...records
        .filter(counts)
        .slice(0, 20)
        .map(
          (r) =>
            `${r.date}  ${r.exerciseName}: ${r.reps}${r.selfReported ? " (self-reported)" : r.avgScore !== null ? ` (form ${r.avgScore})` : ""}`,
        ),
    ].filter((l): l is string => l !== null);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reknit progress", text });
        setShared("Shared.");
      } else {
        await navigator.clipboard.writeText(text);
        setShared("Copied a summary to paste into an email or message.");
      }
    } catch {
      setShared(null);
    }
  };

  return (
    <div className="space-y-3 px-5 pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-extrabold">Progress</h1>
        <Pill tone="ok">{thisMonth} this month</Pill>
      </div>

      <div className="flex rounded-full bg-white/70 p-1 ring-1 ring-[#DCE6EA]" role="tablist">
        {(["week", "month", "all"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-full py-1.5 font-sans text-xs font-extrabold capitalize ${
              view === v ? "bg-white text-ink shadow-[0_2px_8px_rgba(60,100,120,.15)]" : "text-ink/45"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <Card className="p-3.5">
        {view === "month" && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
                className="px-2 font-extrabold text-ink/50"
              >
                ‹
              </button>
              <span className="font-sans text-sm font-extrabold">{MONTH.format(new Date(cursor.y, cursor.m, 1))}</span>
              <button
                type="button"
                aria-label="Next month"
                disabled={atCurrentMonth}
                onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
                className="px-2 font-extrabold text-ink/50 disabled:opacity-25"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="pb-1 font-sans text-[10px] font-extrabold text-ink/40">
                  {d}
                </span>
              ))}
              {monthGrid(cursor.y, cursor.m, days, today).map((c, i) =>
                c === null ? (
                  <span key={`b${i}`} />
                ) : (
                  <button
                    key={c.key}
                    type="button"
                    disabled={c.future}
                    onClick={() => setSelected(c.key === selected ? null : c.key)}
                    aria-label={`${c.key}${c.trained ? ", trained" : ""}`}
                    className={`flex h-9 flex-col items-center justify-center gap-0.5 rounded-lg font-sans text-xs font-bold ${
                      c.future ? "text-ink/25" : "text-ink/75"
                    } ${selected === c.key ? "bg-success-soft" : ""}`}
                  >
                    <span className={c.isToday ? "flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-mint-deep" : ""}>
                      {c.day}
                    </span>
                    <i className={`block h-1.5 w-1.5 rounded-full ${c.trained ? "bg-mint-deep" : "bg-transparent"}`} />
                  </button>
                ),
              )}
            </div>
          </>
        )}

        {view === "week" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)} className="px-2 font-extrabold text-ink/50">
                ‹
              </button>
              <span className="font-sans text-sm font-extrabold">
                {weekOffset === 0
                  ? "This week"
                  : `Week of ${parseKey(week[0].key).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
              </span>
              <button
                type="button"
                aria-label="Next week"
                disabled={weekOffset === 0}
                onClick={() => setWeekOffset((w) => w + 1)}
                className="px-2 font-extrabold text-ink/50 disabled:opacity-25"
              >
                ›
              </button>
            </div>
            <div className="flex justify-between">
              {week.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  disabled={d.state === "upcoming"}
                  onClick={() => setSelected(d.key === selected ? null : d.key)}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold ${
                      d.state === "done"
                        ? "bg-mint-deep text-white"
                        : d.state === "today"
                          ? "ring-2 ring-mint-deep"
                          : d.state === "missed"
                            ? "bg-[#E7EDF0] text-ink/40"
                            : "text-ink/25 ring-1 ring-[#DCE6EA]"
                    } ${selected === d.key ? "outline-2 outline-offset-2 outline-sky" : ""}`}
                  >
                    {parseKey(d.key).getDate()}
                  </span>
                  <span className="font-sans text-[10px] font-bold text-ink/45">{d.letter}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === "all" && (
          <div className="space-y-1.5">
            {months.map((mo) => (
              <button
                key={`${mo.y}-${mo.m}`}
                type="button"
                onClick={() => {
                  setCursor({ y: mo.y, m: mo.m });
                  setView("month");
                }}
                className="flex w-full items-center gap-3"
              >
                <span className="w-20 text-left font-sans text-xs font-bold text-ink/60">
                  {MONTH_SHORT.format(new Date(mo.y, mo.m, 1))}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#E3EEF1]">
                  <span
                    className="block h-full rounded-full bg-mint-deep"
                    style={{ width: `${(mo.n / new Date(mo.y, mo.m + 1, 0).getDate()) * 100}%` }}
                  />
                </span>
                <span className="w-14 text-right font-sans text-xs font-extrabold">{mo.n} days</span>
              </button>
            ))}
            <p className="pt-1 font-sans text-[11px] text-ink/45">{days.size} days trained in total.</p>
          </div>
        )}

        {view !== "all" && (
          <div className="mt-2 flex items-center justify-between font-sans text-[11px] text-ink/45">
            <span className="flex items-center gap-1.5">
              <i className="block h-1.5 w-1.5 rounded-full bg-mint-deep" /> day trained
            </span>
            <span>Tap a day for details</span>
          </div>
        )}
      </Card>

      {selected && (
        <Card className="p-3.5">
          <p className={eyebrow}>{DAY.format(parseKey(selected))}</p>
          {dayRecords.length === 0 ? (
            <p className="mt-1 font-sans text-sm text-ink/55">
              {days.has(selected) ? "Session marked complete." : "No training logged."}
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {dayRecords.map((r) => (
                <RecordRow key={r.id} r={r} />
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="p-3.5">
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm font-extrabold">Pain</span>
          {change && (
            <Pill tone={change.delta < 0 ? "ok" : change.delta > 0 ? "warn" : "soft"} className="text-[10px]">
              {change.delta < 0
                ? `Down ${-change.delta} point${change.delta === -1 ? "" : "s"}`
                : change.delta > 0
                  ? `Up ${change.delta} point${change.delta === 1 ? "" : "s"}`
                  : "No change"}
            </Pill>
          )}
        </div>
        {change ? (
          <>
            <Sparkline points={change.points} />
            <div className="flex justify-between font-sans text-[11px] text-ink/50">
              <span>{change.start} at the start</span>
              <span>{change.now} now</span>
            </div>
          </>
        ) : (
          <p className="mt-1 font-sans text-xs text-ink/55">
            {pain.length === 1
              ? "One check-in so far. The change shows from your second."
              : "Log how you feel on Today to see this change."}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Best hold" value={best ? formatHold(best) : "–"} />
        <Stat label="Sessions" value={String(days.size)} />
        <Stat label="Avg form" value={summary.avgScore === null ? "–" : String(summary.avgScore)} />
      </div>

      <button
        type="button"
        onClick={share}
        className="w-full rounded-full bg-white py-3 font-sans text-sm font-bold text-mint-deep shadow-[0_4px_14px_rgba(60,100,120,0.12)]"
      >
        Share with clinician
      </button>
      {shared && <p className="text-center font-sans text-xs text-ink/55">{shared}</p>}
      <p className="pb-2 text-center font-sans text-[11px] text-ink/40">
        Everything here is from your own sessions and check-ins. Nothing is sample data.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl px-3 py-2.5">
      <p className="font-sans text-[11px] text-ink/50">{label}</p>
      <p className="font-display text-lg font-extrabold">{value}</p>
    </Card>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const W = 200;
  const H = 34;
  const x = (i: number) => 6 + (i / Math.max(1, points.length - 1)) * (W - 12);
  const y = (v: number) => 4 + (v / 10) * (H - 8);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-1 h-9 w-full"
      role="img"
      aria-label={`Pain over ${points.length} check-ins, from ${points[0]} to ${last} out of 10`}
    >
      <path d={d} fill="none" stroke="#2FA67F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(last)} r="4" fill="#2FA67F" />
    </svg>
  );
}

function RecordRow({ r }: { r: ExerciseRecord }) {
  const sets = r.setDetails ?? [];
  return (
    <div className="rounded-xl bg-chip px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-sans text-sm font-bold">{r.exerciseName}</span>
        {r.selfReported ? (
          <span className="shrink-0 font-sans text-[10px] font-bold text-ink/45">self-reported</span>
        ) : (
          r.avgScore !== null && (
            <span className="shrink-0 font-sans text-xs font-extrabold text-mint-deep">form {r.avgScore}</span>
          )
        )}
      </div>
      <p className="font-sans text-[11px] text-ink/55">
        {sets.length > 0
          ? sets
              .map(
                (s, i) =>
                  `${i + 1}: ${s.heldMs ? formatHold(s.heldMs) : "rep"}${s.form !== null ? ` · ${s.form}` : ""}${s.partial ? " (partial)" : ""}`,
              )
              .join("   ")
          : r.selfReported
            ? "Marked done"
            : `${r.reps} counted`}
      </p>
    </div>
  );
}
