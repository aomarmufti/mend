"use client";

import { DEFAULT_CONDITION_SLUG, getCondition, type Condition } from "@/data/conditions";

const KEY = "mend:active-condition:v1";

/** Whether the user has been through the area → condition picker yet. */
export function hasChosenCondition(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function readActiveConditionSlug(): string {
  if (typeof window === "undefined") return DEFAULT_CONDITION_SLUG;
  try {
    return window.localStorage.getItem(KEY) ?? DEFAULT_CONDITION_SLUG;
  } catch {
    return DEFAULT_CONDITION_SLUG;
  }
}

export function readActiveCondition(): Condition {
  return (
    getCondition(readActiveConditionSlug()) ??
    getCondition(DEFAULT_CONDITION_SLUG)!
  );
}

export function writeActiveCondition(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, slug);
  } catch {
    /* private mode / quota — the app still works, it just won't remember */
  }
}
