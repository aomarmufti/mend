"use client";

/**
 * Sample history for presentations: five past days of sessions with form scores
 * that improve and pain that comes down, so the calendar, streak and pain trend
 * have something to show on a fresh phone. It is always labelled as sample data
 * and can be removed in one tap. It never touches today, so a live session can
 * still be done on stage.
 */

import { useSyncExternalStore } from "react";
import { addRecords, localDateKey, removeRecords, type ExerciseRecord } from "@/lib/exerciseLog";
import { painOn, removePainOn, logPainOn } from "@/lib/localSession";
import { readRaw, subscribe, writeRaw } from "@/lib/store";

export const DEMO_KEY = "mend:demo:v1";

const FORM = [72, 75, 79, 82, 85]; // oldest to newest
const PAIN = [6, 5, 5, 4, 4];

interface DemoState {
  painDates: string[];
}

function readState(): DemoState | null {
  try {
    const raw = readRaw(DEMO_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<DemoState>;
    return { painDates: Array.isArray(p.painDates) ? p.painDates : [] };
  } catch {
    return null;
  }
}

export function useDemoActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readRaw(DEMO_KEY) !== null,
    () => false,
  );
}

export interface DemoExercise {
  slug: string;
  name: string;
}

/**
 * Adds sample days before today for the given plan's exercises. Days that already
 * hold real data are left alone.
 */
export function addDemoHistory(conditionSlug: string, exercises: DemoExercise[], realDates: Set<string>) {
  if (readState() || exercises.length === 0) return;
  const records: ExerciseRecord[] = [];
  const painDates: string[] = [];
  const now = new Date();
  for (let i = 0; i < FORM.length; i++) {
    const ago = FORM.length - i; // 5 days ago ... 1 day ago
    const day = new Date(now);
    day.setDate(day.getDate() - ago);
    day.setHours(8, 0, 0, 0);
    const key = localDateKey(day);
    if (realDates.has(key)) continue;
    exercises.forEach((e, n) => {
      records.push({
        id: `demo-${key}-${e.slug}`,
        date: key,
        at: day.getTime() + n * 4 * 60_000,
        conditionSlug,
        exerciseSlug: e.slug,
        exerciseName: e.name,
        reps: 5,
        sets: 1,
        durationMs: 45_000,
        avgScore: FORM[i],
        selfReported: false,
        demo: true,
      });
    });
    if (painOn(key) === null) {
      logPainOn(key, PAIN[i]);
      painDates.push(key);
    }
  }
  addRecords(records);
  writeRaw(DEMO_KEY, JSON.stringify({ painDates } satisfies DemoState));
}

/** Removes everything sample history added, and nothing else. */
export function removeDemoHistory() {
  const state = readState();
  removeRecords((r) => r.demo === true || r.id.startsWith("demo-"));
  state?.painDates.forEach(removePainOn);
  writeRaw(DEMO_KEY, null);
}
