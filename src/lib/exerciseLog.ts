/**
 * Per-exercise session history: what was done, how many reps and sets, and how
 * well it scored when the camera was coaching. Separate from `localSession`,
 * which tracks whether the *day's* session was completed at all.
 *
 * Prototype-only local persistence — a real backend would replace this.
 */

const STORAGE_KEY = "mend:exercise-log:v1";
const MAX_RECORDS = 500;

export interface ExerciseRecord {
  id: string;
  /** YYYY-MM-DD in the browser's local calendar, not UTC. */
  date: string;
  at: number;
  conditionSlug: string;
  exerciseSlug: string;
  exerciseName: string;
  reps: number;
  sets: number;
  durationMs: number;
  /** Mean coach accuracy across the session, or null when untracked. */
  avgScore: number | null;
}

// Deliberately NOT toISOString().slice(0, 10) — that is the UTC calendar date,
// which lands on the wrong day near midnight for anyone outside UTC.
export function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function read(): ExerciseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExerciseRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: ExerciseRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* private mode / quota — history is a nicety, not a blocker */
  }
}

export function logExercise(
  record: Omit<ExerciseRecord, "id" | "date" | "at">
): ExerciseRecord {
  const now = new Date();
  const full: ExerciseRecord = {
    ...record,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    date: localDateKey(now),
    at: now.getTime(),
  };
  // Newest first, capped so a long-running prototype cannot fill storage.
  write([full, ...read()].slice(0, MAX_RECORDS));
  return full;
}

export function allRecords(): ExerciseRecord[] {
  return read();
}

/** Stable empty reference, so a server render never looks like a store change. */
export const NO_RECORDS: ExerciseRecord[] = [];

function rawSnapshotKey(): string {
  const raw =
    typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_KEY);
  return `${localDateKey(new Date())}|${raw ?? ""}`;
}

const snapshotCache = new Map<number, { key: string; value: ExerciseRecord[] }>();

/**
 * `useSyncExternalStore` requires getSnapshot to return the same reference
 * while nothing has changed, or React treats every render as a store update
 * and loops. Cached per range against the raw storage string (plus today's
 * date, since the windows are relative to it).
 */
export function recordsSnapshot(days: number): ExerciseRecord[] {
  if (typeof window === "undefined") return NO_RECORDS;
  const key = rawSnapshotKey();
  const hit = snapshotCache.get(days);
  if (hit && hit.key === key) return hit.value;
  const value = days === 0 ? allRecords() : recordsWithin(days);
  snapshotCache.set(days, { key, value });
  return value;
}

/** Records from the last `days` calendar days, newest first. */
export function recordsWithin(days: number): ExerciseRecord[] {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffMs = cutoff.getTime();
  return read().filter((r) => r.at >= cutoffMs);
}

export interface DayGroup {
  date: string;
  label: string;
  records: ExerciseRecord[];
  totalReps: number;
  totalSets: number;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function labelFor(dateKey: string): string {
  const today = localDateKey(new Date());
  if (dateKey === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === localDateKey(yesterday)) return "Yesterday";
  // Parse as local midnight rather than letting Date treat it as UTC.
  const [y, m, d] = dateKey.split("-").map(Number);
  return DAY_LABEL.format(new Date(y, m - 1, d));
}

/** Group records by calendar day, newest day first. */
export function groupByDay(records: ExerciseRecord[]): DayGroup[] {
  const byDate = new Map<string, ExerciseRecord[]>();
  for (const r of records) {
    const existing = byDate.get(r.date);
    if (existing) existing.push(r);
    else byDate.set(r.date, [r]);
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, rs]) => ({
      date,
      label: labelFor(date),
      records: rs,
      totalReps: rs.reduce((sum, r) => sum + r.reps, 0),
      totalSets: rs.reduce((sum, r) => sum + r.sets, 0),
    }));
}

export interface LogSummary {
  sessions: number;
  reps: number;
  sets: number;
  activeDays: number;
  avgScore: number | null;
}

export function summarise(records: ExerciseRecord[]): LogSummary {
  const scored = records.filter(
    (r): r is ExerciseRecord & { avgScore: number } => r.avgScore !== null
  );
  return {
    sessions: records.length,
    reps: records.reduce((sum, r) => sum + r.reps, 0),
    sets: records.reduce((sum, r) => sum + r.sets, 0),
    activeDays: new Set(records.map((r) => r.date)).size,
    avgScore: scored.length
      ? Math.round(scored.reduce((sum, r) => sum + r.avgScore, 0) / scored.length)
      : null,
  };
}
