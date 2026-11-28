/** Streak lengths worth a word of encouragement. */
export const MILESTONES = [3, 7, 14, 30, 60, 100] as const;

const LINES: Record<number, string> = {
  3: "3 days in a row. The habit is starting.",
  7: "A full week. Consistency is what moves results.",
  14: "Two weeks in a row. Most people have stopped by now.",
  30: "30 days. This is part of your routine now.",
  60: "60 days. Look how far you've come.",
  100: "100 days. That is real commitment.",
};

/** A message when the streak has just reached a milestone, otherwise null. */
export function milestoneFor(streak: number): { days: number; line: string } | null {
  return (MILESTONES as readonly number[]).includes(streak) ? { days: streak, line: LINES[streak] } : null;
}

/** The next milestone to aim for, and how many days away it is. */
export function nextMilestone(streak: number): { days: number; away: number } | null {
  const next = MILESTONES.find((m) => m > streak);
  return next ? { days: next, away: next - streak } : null;
}
