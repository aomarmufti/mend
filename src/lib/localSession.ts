// Prototype-only local persistence. A real backend would replace all of this;
// it exists so the Today <-> Session <-> Progress flow feels alive across
// reloads instead of resetting to static mock data every time.

const STORAGE_KEY = "mend:session-log:v1";
const STREAK_BASELINE = 5; // days of streak "already banked" before local tracking started
const PAIN_BASELINE = [6, 5, 5, 4, 3, 3, 2]; // mock history, most recent last

interface SessionLog {
  completedDates: string[]; // YYYY-MM-DD, sessions marked done
  painLog: Record<string, number>; // YYYY-MM-DD -> pain 0-10
}

// Deliberately NOT date.toISOString().slice(0, 10) — that gives the UTC
// calendar date, which silently shifts to the wrong day near midnight for
// any visitor not in UTC. This uses the browser's local date instead.
function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey(): string {
  return localDateKey(new Date());
}

function read(): SessionLog {
  if (typeof window === "undefined") return { completedDates: [], painLog: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedDates: [], painLog: {} };
    const parsed = JSON.parse(raw);
    return {
      completedDates: Array.isArray(parsed.completedDates) ? parsed.completedDates : [],
      painLog: typeof parsed.painLog === "object" && parsed.painLog ? parsed.painLog : {},
    };
  } catch {
    return { completedDates: [], painLog: {} };
  }
}

function write(log: SessionLog) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

function rawSnapshotKey(): string {
  const raw = typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_KEY);
  return `${todayKey()}|${raw ?? ""}`;
}

/**
 * useSyncExternalStore requires getSnapshot to return a referentially stable
 * value when nothing has changed — otherwise React treats every render as a
 * "the store changed" signal and loops. This memoizes an array/object
 * snapshot against the raw storage string (+ today's date) so repeated calls
 * between actual writes return the same reference.
 */
function memoized<T>(compute: () => T): () => T {
  let cacheKey: string | null = null;
  let cacheValue: T;
  return () => {
    const key = rawSnapshotKey();
    if (cacheKey !== key) {
      cacheKey = key;
      cacheValue = compute();
    }
    return cacheValue;
  };
}

export function isCompletedToday(): boolean {
  return read().completedDates.includes(todayKey());
}

export function markCompletedToday() {
  const log = read();
  const key = todayKey();
  if (!log.completedDates.includes(key)) {
    log.completedDates.push(key);
    write(log);
  }
}

/** Consecutive days ending today (or yesterday, if today isn't done yet) that have a completed session. */
export function currentStreak(): number {
  const log = read();
  const set = new Set(log.completedDates);
  const cursor = new Date();
  if (!set.has(todayKey())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (set.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak > 0 ? STREAK_BASELINE + streak : STREAK_BASELINE;
}

export function logPain(value: number) {
  const log = read();
  log.painLog[todayKey()] = value;
  write(log);
}

/** Today's logged pain value, or null if no check-in has been logged yet today. */
export function todaysPain(): number | null {
  const value = read().painLog[todayKey()];
  return value === undefined ? null : value;
}

/** Last 7 sessions of pain history: mock baseline with any locally-logged days appended/overridden. */
export const painHistory = memoized((): number[] => {
  const log = read();
  const todaysEntry = log.painLog[todayKey()];
  if (todaysEntry === undefined) return PAIN_BASELINE;
  return [...PAIN_BASELINE.slice(1), todaysEntry];
});

/** Last 7 calendar days, oldest first, with whether a session was completed. */
export const weekAdherence = memoized(
  (): { label: string; done: boolean; isToday: boolean }[] => {
    const log = read();
    const set = new Set(log.completedDates);
    const days: { label: string; done: boolean; isToday: boolean }[] = [];
    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      days.push({
        label: labels[d.getDay()],
        done: set.has(key),
        isToday: i === 0,
      });
    }
    return days;
  }
);
