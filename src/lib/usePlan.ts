"use client";

import { useSyncExternalStore } from "react";
import { planFor, sessionFor, type CatalogExercise, type PlanShape } from "@/data/catalog";
import { ACTIVE_CONDITION_KEY } from "@/lib/activeCondition";
import { canUse, useProfile, type Plan } from "@/lib/profile";
import { readRaw, subscribe } from "@/lib/store";

const activeSnapshot = () => readRaw(ACTIVE_CONDITION_KEY);

export interface ActivePlan {
  plan: Plan;
  shape: PlanShape;
  /** Today's exercises, all of them, entitled or not. */
  session: CatalogExercise[];
  /** The part of today's session this user can do right now. */
  usable: CatalogExercise[];
}

/** The plan the user is looking at, or null before they have one. */
export function useActivePlan(): ActivePlan | null {
  const profile = useProfile();
  const active = useSyncExternalStore(subscribe, activeSnapshot, () => null);
  const plan = profile.plans.find((p) => p.conditionSlug === active) ?? profile.plans[0];
  if (!plan) return null;
  const shape = planFor(plan.conditionSlug);
  if (!shape) return null;
  const session = sessionFor(shape, plan.stage);
  return { plan, shape, session, usable: session.filter((e) => canUse(profile, e.slug)) };
}
