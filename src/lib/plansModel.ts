/**
 * Pure model for "a user can be on more than one plan" (e.g. a knee and a
 * shoulder at once). No storage or React in here so it can be unit tested.
 */

export interface Plan {
  id: string;
  conditionSlug: string;
  stageIndex: number;
  startedAt: number;
}

export interface PlansState {
  plans: Plan[];
  activeId: string | null;
}

export const EMPTY_PLANS: PlansState = { plans: [], activeId: null };

function newId(now: number, n: number): string {
  return `plan-${now.toString(36)}-${n}`;
}

/** Parse stored JSON defensively; anything malformed becomes an empty state. */
export function parsePlans(raw: string | null | undefined): PlansState {
  if (!raw) return EMPTY_PLANS;
  try {
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.plans)) return EMPTY_PLANS;
    const plans: Plan[] = p.plans
      .filter((x: unknown): x is Plan => {
        const o = x as Plan;
        return !!o && typeof o.id === "string" && typeof o.conditionSlug === "string";
      })
      .map((o: Plan) => ({
        id: o.id,
        conditionSlug: o.conditionSlug,
        stageIndex: Number.isFinite(o.stageIndex) ? o.stageIndex : 0,
        startedAt: Number.isFinite(o.startedAt) ? o.startedAt : 0,
      }));
    const activeId = plans.some((x) => x.id === p.activeId) ? p.activeId : (plans[0]?.id ?? null);
    return { plans, activeId };
  } catch {
    return EMPTY_PLANS;
  }
}

/** Existing single-condition users keep their choice as their first plan. */
export function migrateLegacy(legacyConditionSlug: string | null, now: number): PlansState {
  if (!legacyConditionSlug) return EMPTY_PLANS;
  const id = newId(now, 0);
  return {
    plans: [{ id, conditionSlug: legacyConditionSlug, stageIndex: 0, startedAt: now }],
    activeId: id,
  };
}

/** Adds a plan for the condition (or just activates it if already present). */
export function addPlan(state: PlansState, conditionSlug: string, now: number): PlansState {
  const existing = state.plans.find((p) => p.conditionSlug === conditionSlug);
  if (existing) return { ...state, activeId: existing.id };
  const id = newId(now, state.plans.length);
  return {
    plans: [...state.plans, { id, conditionSlug, stageIndex: 0, startedAt: now }],
    activeId: id,
  };
}

export function setActivePlan(state: PlansState, id: string): PlansState {
  return state.plans.some((p) => p.id === id) ? { ...state, activeId: id } : state;
}

export function removePlan(state: PlansState, id: string): PlansState {
  const plans = state.plans.filter((p) => p.id !== id);
  const activeId = state.activeId === id ? (plans[0]?.id ?? null) : state.activeId;
  return { plans, activeId };
}

export function activePlan(state: PlansState): Plan | null {
  return state.plans.find((p) => p.id === state.activeId) ?? null;
}
