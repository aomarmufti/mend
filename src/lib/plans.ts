"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_PLANS,
  addPlan as addPlanTo,
  migrateLegacy,
  parsePlans,
  removePlan as removePlanFrom,
  setActivePlan as setActiveIn,
  activePlan,
  type Plan,
  type PlansState,
} from "@/lib/plansModel";
import { writeActiveCondition } from "@/lib/activeCondition";

const KEY = "mend:plans:v1";
const LEGACY_KEY = "mend:active-condition:v1";
const EVENT = "mend:plans-changed";

function rawKey(): string {
  try {
    return `${window.localStorage.getItem(KEY) ?? ""}|${window.localStorage.getItem(LEGACY_KEY) ?? ""}`;
  } catch {
    return "";
  }
}

let cacheKey: string | null = null;
let cacheValue: PlansState = EMPTY_PLANS;

/** Referentially stable between writes, as useSyncExternalStore requires. */
export function readPlans(): PlansState {
  if (typeof window === "undefined") return EMPTY_PLANS;
  const k = rawKey();
  if (k === cacheKey) return cacheValue;
  let state = EMPTY_PLANS;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw
      ? parsePlans(raw)
      : migrateLegacy(window.localStorage.getItem(LEGACY_KEY), 0);
  } catch {
    /* storage unavailable: behave as a user with no plans */
  }
  cacheKey = k;
  cacheValue = state;
  return state;
}

function commit(next: PlansState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  // Keep the single-condition key in step so screens not yet on the plans
  // model (Today, session, coach) follow the active plan.
  const active = activePlan(next);
  if (active) writeActiveCondition(active.conditionSlug);
  window.dispatchEvent(new Event(EVENT));
}

export function addPlan(conditionSlug: string) {
  commit(addPlanTo(readPlans(), conditionSlug, Date.now()));
}
export function setActivePlan(id: string) {
  commit(setActiveIn(readPlans(), id));
}
export function removePlan(id: string) {
  commit(removePlanFrom(readPlans(), id));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePlans(): PlansState {
  return useSyncExternalStore(subscribe, readPlans, () => EMPTY_PLANS);
}

export type { Plan, PlansState };
