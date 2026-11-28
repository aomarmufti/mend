"use client";

import Link from "next/link";
import { useProfile } from "@/lib/profile";
import { areaLowerLabel } from "@/data/catalog";
import { planFor } from "@/data/catalog";
import { useDemoActive } from "@/lib/demoData";
import { counts, painChange, trainedDays, useAllRecords, useCompletedDates, usePainEntries } from "@/lib/progress";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmt = (key: string) => DATE.format(new Date(`${key}T12:00:00`));

/**
 * A plain, printable summary to show or send to a physio: Print or Save as PDF
 * from the share sheet. Everything comes from this device.
 */
export default function ReportPage() {
  const profile = useProfile();
  const pain = usePainEntries();
  const records = useAllRecords();
  const completed = useCompletedDates();
  const days = [...trainedDays(records, completed)].sort();
  const change = painChange(pain);
  const demo = useDemoActive();

  const exercises = new Map<string, number>();
  for (const r of records) if (counts(r)) exercises.set(r.exerciseName, (exercises.get(r.exerciseName) ?? 0) + 1);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 font-sans text-ink print:p-0">
      <div className="flex justify-between print:hidden">
        <Link href="/settings" className="text-sm font-bold text-ink/60">
          ← Back
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-night px-4 py-2 text-sm font-bold text-white">
          Print or save as PDF
        </button>
      </div>

      <h1 className="mt-4 font-display text-3xl font-extrabold">Reknit progress report</h1>
      <p className="mt-1 text-sm text-ink/60">Created {DATE.format(new Date())}. Self-reported and device-measured; not a clinical assessment.</p>
      {demo && (
        <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2 text-sm font-bold text-amber">
          This report includes sample data added for a demonstration.
        </p>
      )}

      <h2 className="mt-6 font-display text-lg font-extrabold">Plans</h2>
      {profile.plans.length === 0 ? (
        <p className="mt-1 text-sm">No plan yet.</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {profile.plans.map((p) => {
            const shape = planFor(p.conditionSlug);
            return (
              <li key={p.conditionSlug}>
                {shape ? `${shape.areaLabel} (${areaLowerLabel(shape.areaLabel)})` : p.conditionSlug}, {p.stage} stage
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-6 font-display text-lg font-extrabold">Training</h2>
      <p className="mt-1 text-sm">
        {days.length} {days.length === 1 ? "day" : "days"} trained
        {days.length > 0 && `, from ${fmt(days[0])} to ${fmt(days[days.length - 1])}`}.
      </p>

      <h2 className="mt-6 font-display text-lg font-extrabold">Pain (0 to 10)</h2>
      {pain.length === 0 ? (
        <p className="mt-1 text-sm">No check-ins yet.</p>
      ) : (
        <>
          {change && (
            <p className="mt-1 text-sm">
              Started at {change.start}, now {change.now} ({change.delta === 0 ? "unchanged" : change.delta < 0 ? `down ${-change.delta}` : `up ${change.delta}`}).
            </p>
          )}
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/20">
                <th className="py-1 font-bold">Date</th>
                <th className="py-1 font-bold">Pain</th>
              </tr>
            </thead>
            <tbody>
              {pain.map((e) => (
                <tr key={e.date} className="border-b border-ink/10">
                  <td className="py-1">{fmt(e.date)}</td>
                  <td className="py-1">{e.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {exercises.size > 0 && (
        <>
          <h2 className="mt-6 font-display text-lg font-extrabold">Exercises done</h2>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {[...exercises].map(([name, n]) => (
              <li key={name}>
                {name}: {n} {n === 1 ? "session" : "sessions"}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
