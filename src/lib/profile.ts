"use client";

/**
 * Who the user is to the app: how they came in, which plans they are on, and
 * where they are in each one.
 *
 * Prototype-only, like the rest of the persistence here. "Continue with Apple"
 * and "Continue with Google" record which button was pressed and nothing
 * else; there is no identity provider behind them yet, and the trial is a
 * start date rather than a store subscription. Both are the shape the real
 * thing will need, so the screens around them are built against a real
 * interface instead of a mock that would have to be unpicked.
 */

import { useSyncExternalStore } from "react";
import type { Stage } from "@/data/exercises";
import { stageOrder } from "@/data/exercises";
import { cachedSnapshot, readRaw, subscribe, writeRaw } from "@/lib/store";
import { ACTIVE_CONDITION_KEY, writeActiveCondition } from "@/lib/activeCondition";

const KEY = "mend:profile:v1";

export const TRIAL_DAYS = 14;

/** The two exercises anyone can try without an account. */
export const FREE_EXERCISES = ["standing-quad-stretch", "standing-calf-stretch"] as const;

export type Provider = "apple" | "google";

export interface Plan {
  conditionSlug: string;
  /** Current stage, for conditions with a staged programme. */
  stage: Stage;
  addedAt: number;
}

export interface Profile {
  /** Null until they sign in. A free-preview user has `preview` set instead. */
  account: { provider: Provider; signedInAt: number } | null;
  /** Chose "Try for free, no sign-up" on the welcome screen. */
  preview: boolean;
  trialStartedAt: number | null;
  /** "HH:MM", 24-hour. */
  reminder: string | null;
  plans: Plan[];
  /** Areas the user asked to hear about when a programme is ready. */
  notifyAreas: string[];
  /** Pain recorded during setup, before the first session. */
  baselinePain: number | null;
}

const EMPTY: Profile = {
  account: null,
  preview: false,
  trialStartedAt: null,
  reminder: null,
  plans: [],
  notifyAreas: [],
  baselinePain: null,
};

function parse(raw: string | null): Profile {
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      account: p.account ?? null,
      preview: !!p.preview,
      trialStartedAt: typeof p.trialStartedAt === "number" ? p.trialStartedAt : null,
      reminder: typeof p.reminder === "string" ? p.reminder : null,
      plans: Array.isArray(p.plans) ? p.plans.filter((x) => x && typeof x.conditionSlug === "string") : [],
      notifyAreas: Array.isArray(p.notifyAreas) ? p.notifyAreas : [],
      baselinePain: typeof p.baselinePain === "number" ? p.baselinePain : null,
    };
  } catch {
    return EMPTY;
  }
}

export function readProfile(): Profile {
  const profile = parse(readRaw(KEY));
  // Someone who picked a condition before plans existed has an active
  // condition and no plan list. Treat that condition as their one plan.
  const legacy = readRaw(ACTIVE_CONDITION_KEY);
  if (profile.plans.length === 0 && legacy) {
    return { ...profile, plans: [{ conditionSlug: legacy, stage: "Early", addedAt: 0 }] };
  }
  return profile;
}

function write(next: Profile) {
  writeRaw(KEY, JSON.stringify(next));
}

function update(fn: (p: Profile) => Profile) {
  write(fn(readProfile()));
}

const profileSnapshot = cachedSnapshot([KEY, ACTIVE_CONDITION_KEY], readProfile);

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, profileSnapshot, () => EMPTY);
}

/** False during the server render and the first client paint, true after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

// ---- actions ---------------------------------------------------------------

export function signIn(provider: Provider) {
  update((p) => ({ ...p, account: { provider, signedInAt: Date.now() }, preview: false }));
}

export function startPreview() {
  update((p) => ({ ...p, preview: true }));
}

export function signOut() {
  writeRaw(KEY, null);
  writeActiveCondition(null);
}

export function startTrial() {
  update((p) => ({ ...p, trialStartedAt: p.trialStartedAt ?? Date.now() }));
}

export function setReminder(time: string | null) {
  update((p) => ({ ...p, reminder: time }));
}

export function setBaselinePain(value: number) {
  update((p) => ({ ...p, baselinePain: value }));
}

export function toggleNotifyArea(area: string) {
  update((p) => ({
    ...p,
    notifyAreas: p.notifyAreas.includes(area)
      ? p.notifyAreas.filter((a) => a !== area)
      : [...p.notifyAreas, area],
  }));
}

/** Add a plan (or re-select an existing one) and make it the active plan. */
export function addPlan(conditionSlug: string) {
  update((p) => {
    const exists = p.plans.some((x) => x.conditionSlug === conditionSlug);
    return exists
      ? p
      : { ...p, plans: [...p.plans, { conditionSlug, stage: "Early", addedAt: Date.now() }] };
  });
  writeActiveCondition(conditionSlug);
}

export function selectPlan(conditionSlug: string) {
  writeActiveCondition(conditionSlug);
}

export function removePlan(conditionSlug: string) {
  const next = readProfile().plans.filter((x) => x.conditionSlug !== conditionSlug);
  update((p) => ({ ...p, plans: next }));
  if (readRaw(ACTIVE_CONDITION_KEY) === conditionSlug) {
    writeActiveCondition(next[0]?.conditionSlug ?? null);
  }
}

export function advanceStage(conditionSlug: string) {
  update((p) => ({
    ...p,
    plans: p.plans.map((x) => {
      if (x.conditionSlug !== conditionSlug) return x;
      const i = stageOrder.indexOf(x.stage);
      return { ...x, stage: stageOrder[Math.min(stageOrder.length - 1, i + 1)] };
    }),
  }));
}

export function setStage(conditionSlug: string, stage: Stage) {
  update((p) => ({
    ...p,
    plans: p.plans.map((x) => (x.conditionSlug === conditionSlug ? { ...x, stage } : x)),
  }));
}

// ---- derived ---------------------------------------------------------------

export function trialDaysLeft(p: Profile, now = Date.now()): number | null {
  if (p.trialStartedAt === null) return null;
  const ms = p.trialStartedAt + TRIAL_DAYS * 86_400_000 - now;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * "full" unlocks every plan; "free" is the two-exercise preview. A signed-in
 * user on an active trial is full. Anyone else, including a trial that has
 * run out, is free: their history stays, new sessions narrow to the preview.
 */
export function entitlement(p: Profile, now = Date.now()): "full" | "free" {
  if (!p.account) return "free";
  const left = trialDaysLeft(p, now);
  return left !== null && left > 0 ? "full" : "free";
}

export function canUse(p: Profile, exerciseSlug: string): boolean {
  return entitlement(p) === "full" || (FREE_EXERCISES as readonly string[]).includes(exerciseSlug);
}

/** Where a visitor with this profile belongs when they open the app. */
export function homeFor(p: Profile): string {
  if (p.plans.length > 0) return "/today";
  if (p.account) return "/start";
  if (p.preview) return "/try";
  return "/welcome";
}

export function reminderLabel(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
