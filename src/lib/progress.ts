"use client";

/**
 * Read-side helpers for everything the Today and Progress screens show. All
 * of it is derived from the user's own logs — exercise records and pain
 * check-ins — and nothing is seeded.
 */

import { useSyncExternalStore } from "react";
import { subscribe } from "@/lib/store";
import {
  NO_RECORDS,
  localDateKey,
  recordsSnapshot,
  type ExerciseRecord,
} from "@/lib/exerciseLog";
import { completedDates, painEntries } from "@/lib/localSession";

const NO_DATES: string[] = [];
const NO_PAIN: { date: string; value: number }[] = [];

export function useAllRecords(): ExerciseRecord[] {
  return useSyncExternalStore(subscribe, () => recordsSnapshot(0), () => NO_RECORDS);
}

export function usePainEntries() {
  return useSyncExternalStore(subscribe, painEntries, () => NO_PAIN);
}

export function useCompletedDates() {
  return useSyncExternalStore(subscribe, completedDates, () => NO_DATES);
}

/** A record counts as training when something was actually done. */
export function counts(r: ExerciseRecord): boolean {
  return r.reps > 0 || !!r.selfReported;
}

/** Every day with training, as YYYY-MM-DD. */
export function trainedDays(records: ExerciseRecord[], completed: string[]): Set<string> {
  const set = new Set(completed);
  for (const r of records) if (counts(r)) set.add(r.date);
  return set;
}

/** Consecutive trained days ending today, or yesterday if today is not done yet. */
export function streakFrom(days: Set<string>, today = new Date()): number {
  const cursor = new Date(today);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(localDateKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export interface WeekDay {
  key: string;
  letter: string;
  state: "done" | "today" | "missed" | "upcoming";
}

/** Monday to Sunday of the week containing `today`. */
export function weekStrip(days: Set<string>, today = new Date()): WeekDay[] {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayKey = localDateKey(today);
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  return letters.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    const state: WeekDay["state"] = days.has(key)
      ? "done"
      : key === todayKey
        ? "today"
        : key < todayKey
          ? "missed"
          : "upcoming";
    return { key, letter, state };
  });
}

export interface MonthCell {
  key: string;
  day: number;
  trained: boolean;
  isToday: boolean;
  future: boolean;
}

/** A Monday-first month grid: leading blanks (null) then one cell per day. */
export function monthGrid(year: number, month: number, days: Set<string>, today = new Date()): (MonthCell | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey(today);
  const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) {
    const key = localDateKey(new Date(year, month, d));
    cells.push({ key, day: d, trained: days.has(key), isToday: key === todayKey, future: key > todayKey });
  }
  return cells;
}

/** Slugs of exercises with a counting record today. */
export function doneToday(records: ExerciseRecord[], today = new Date()): Set<string> {
  const key = localDateKey(today);
  return new Set(records.filter((r) => r.date === key && counts(r)).map((r) => r.exerciseSlug));
}

export function bestHoldMs(records: ExerciseRecord[]): number | null {
  let best = 0;
  for (const r of records) {
    const b = r.bestHoldMs ?? Math.max(0, ...(r.setDetails ?? []).map((s) => s.heldMs));
    if (b > best) best = b;
  }
  return best > 0 ? best : null;
}

export interface PainChange {
  start: number;
  now: number;
  delta: number;
  points: number[];
}

/** First and latest pain check-ins. Null until there are two to compare. */
export function painChange(entries: { date: string; value: number }[]): PainChange | null {
  if (entries.length < 2) return null;
  const start = entries[0].value;
  const now = entries[entries.length - 1].value;
  return { start, now, delta: now - start, points: entries.slice(-14).map((e) => e.value) };
}

export function formatHold(ms: number): string {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}
