"use client";

import { readRaw, writeRaw } from "@/lib/store";

export const TIPS_KEY = "mend:tips:v1";

export interface Tips {
  /** The Home Screen tip was dismissed. */
  a2hs?: boolean;
  /** How many times the set-up guide has played (or been skipped). */
  guideSeen?: number;
}

export function readTips(): Tips {
  try {
    const raw = readRaw(TIPS_KEY);
    return raw ? (JSON.parse(raw) as Tips) : {};
  } catch {
    return {};
  }
}

/** Merges into the stored tips, so one tip never wipes another. */
export function setTips(patch: Partial<Tips>) {
  writeRaw(TIPS_KEY, JSON.stringify({ ...readTips(), ...patch }));
}

/** The set-up guide plays for the first three sessions, then only when asked. */
export const GUIDE_PLAYS = 3;
