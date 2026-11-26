"use client";

/**
 * Explicit consent to process health data (UK GDPR Article 9). Asked once in
 * setup, on its own screen and separate from any terms. The version and time
 * are stored, so a change to the wording can ask again, and it can be withdrawn.
 */

import { useSyncExternalStore } from "react";
import { cachedSnapshot, readRaw, subscribe, writeRaw } from "@/lib/store";

export const CONSENT_KEY = "mend:consent:v1";
/** Bump when the wording of the consent screen changes. */
export const CONSENT_VERSION = "2026-11";

export interface Consent {
  version: string;
  at: number;
}

export function readConsent(): Consent | null {
  try {
    const raw = readRaw(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Consent>;
    return typeof c.version === "string" && typeof c.at === "number" ? { version: c.version, at: c.at } : null;
  } catch {
    return null;
  }
}

export function hasCurrentConsent(c: Consent | null): boolean {
  return !!c && c.version === CONSENT_VERSION;
}

export function giveConsent() {
  writeRaw(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, at: Date.now() }));
}

export function withdrawConsent() {
  writeRaw(CONSENT_KEY, null);
}

const snapshot = cachedSnapshot([CONSENT_KEY], readConsent);

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
