/**
 * Safety rules: who should not be given a plan, when to stop a session, and
 * when to suggest moving a stage up or down.
 *
 * DRAFT CLINICAL CONTENT. The thresholds and wording are conservative general
 * guidance and have not been signed off by a physiotherapist (Shortcut 84).
 * They are kept in one place so a clinician can review and change them.
 */

import type { Stage } from "@/data/exercises";
import { stageOrder } from "@/data/exercises";

export const RED_FLAGS: string[] = [
  "You have just had a fall or injury and can't put weight on the leg, or the joint looks out of shape.",
  "The joint is hot, red and swollen, or you have a fever with it.",
  "You have numbness or pins and needles around your groin or inner thighs, or you have lost control of your bladder or bowels.",
  "You have new weakness or numbness in both legs.",
  "Your calf is swollen, red, warm and painful, or you have chest pain or sudden breathlessness.",
  "You have constant pain that wakes you at night and keeps getting worse, or you have lost weight without trying.",
];

/** A pain score this high during a session means stop for today. */
export const STOP_PAIN = 7;

export function shouldStop(pain: number): boolean {
  return pain >= STOP_PAIN;
}

/** To suggest moving up a stage: pain this low on the last three check-ins... */
export const MOVE_UP_PAIN_MAX = 3;
/** ...and training on at least this many of the last 14 days. */
export const MOVE_UP_DAYS = 8;

export interface StageReadiness {
  /** The latest pain check-ins, oldest first, at most three. */
  lastPain: number[];
  painOk: boolean;
  trained: number;
  daysOk: boolean;
  /** Both conditions met. */
  ready: boolean;
}

/** How close someone is to being suggested the next stage, for showing them. */
export function stageReadiness({ pain, trainedLast14 }: Pick<ProgressionInput, "pain" | "trainedLast14">): StageReadiness {
  const lastPain = pain.slice(-3).map((p) => p.value);
  const painOk = lastPain.length === 3 && lastPain.every((v) => v <= MOVE_UP_PAIN_MAX);
  const daysOk = trainedLast14 >= MOVE_UP_DAYS;
  return { lastPain, painOk, trained: trainedLast14, daysOk, ready: painOk && daysOk };
}

export type Suggestion =
  | { kind: "step-back"; to: Stage; reason: string }
  | { kind: "progress"; to: Stage; reason: string }
  | null;

export interface ProgressionInput {
  stage: Stage;
  /** Pain check-ins, oldest first. */
  pain: { date: string; value: number }[];
  /** Days with training in the last 14. */
  trainedLast14: number;
}

/**
 * Step back after a flare-up: the latest pain is high, or the last two check-ins
 * are well above the starting point. Suggest moving on only when pain is low
 * and steady and the person has been training regularly.
 */
export function suggestStage({ stage, pain, trainedLast14 }: ProgressionInput): Suggestion {
  const i = stageOrder.indexOf(stage);
  if (pain.length === 0) return null;
  const last = pain[pain.length - 1].value;
  const start = pain[0].value;
  const lastTwo = pain.slice(-2).map((p) => p.value);

  const flare = last >= STOP_PAIN || (pain.length >= 3 && lastTwo.every((v) => v >= start + 3));
  if (flare && i > 0) {
    return { kind: "step-back", to: stageOrder[i - 1], reason: "Your pain has flared up. Going back a stage lets it settle." };
  }

  if (stageReadiness({ pain, trainedLast14 }).ready && i < stageOrder.length - 1) {
    return { kind: "progress", to: stageOrder[i + 1], reason: "Your pain is low and you have been training regularly." };
  }
  return null;
}
