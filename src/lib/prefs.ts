"use client";

/**
 * Coach preferences, kept on the device: spoken cues, chimes, vibration and
 * speech speed. The coach reads them straight from storage so a change in
 * Settings applies to the next cue, and the in-session speaker button writes
 * them back so it is remembered.
 */

import { useSyncExternalStore } from "react";
import { cachedSnapshot, readRaw, subscribe, writeRaw } from "@/lib/store";
import { DEFAULT_LOOK, cleanLook, type AvatarLook } from "@/components/coach/avatar";

export const PREFS_KEY = "mend:prefs:v1";

export interface Prefs {
  voice: boolean;
  sound: boolean;
  haptics: boolean;
  /** Speech rate multiplier, 0.8 to 1.3. */
  voiceSpeed: number;
  /** Show an avatar in the coach instead of the camera picture and skeleton. */
  avatar: boolean;
  look: AvatarLook;
}

export const DEFAULT_PREFS: Prefs = { voice: true, sound: true, haptics: true, voiceSpeed: 1, avatar: false, look: DEFAULT_LOOK };

export function readPrefs(): Prefs {
  try {
    const raw = readRaw(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    const speed = typeof p.voiceSpeed === "number" ? Math.min(1.3, Math.max(0.8, p.voiceSpeed)) : 1;
    return {
      voice: p.voice !== false,
      sound: p.sound !== false,
      haptics: p.haptics !== false,
      voiceSpeed: speed,
      avatar: p.avatar === true,
      look: cleanLook(p.look),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setPrefs(patch: Partial<Prefs>) {
  writeRaw(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch }));
}

const snapshot = cachedSnapshot([PREFS_KEY], readPrefs);

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFS);
}
