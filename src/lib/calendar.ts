import { SITE_URL } from "@/lib/site";

/** "HH:MM" in 24-hour time, or null if it isn't one. */
export function parseTime(value: string | null | undefined): { h: number; m: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? "");
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Escapes text for an iCalendar value. */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a line at 75 characters, as the iCalendar format requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  out.push(rest);
  return out.join("\r\n");
}

export interface ReminderOptions {
  /** "HH:MM". */
  time: string;
  /** Short name of the plan, such as "Knee". Plain text. */
  label: string;
  /** Roughly how long a session takes. */
  minutes: number;
  /** The user's local date, YYYY-MM-DD: the first day of the repeating event. */
  startDate: string;
  now?: Date;
}

/**
 * A daily repeating calendar event with an alert at the start time. It uses the
 * phone's local time (a "floating" time), so it fires at 08:00 wherever the
 * person is. Opening the file in Safari or Mail offers to add it to Calendar.
 */
export function buildReminderIcs({ time, label, minutes, startDate, now = new Date() }: ReminderOptions): string {
  const t = parseTime(time);
  if (!t) throw new Error("Invalid time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Invalid date");
  const safeLabel = label.replace(/[^A-Za-z0-9 &'-]/g, "").trim().slice(0, 40) || "Daily";
  const mins = Math.min(60, Math.max(3, Math.round(minutes) || 10));
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const start = `${startDate.replace(/-/g, "")}T${pad(t.h)}${pad(t.m)}00`;
  const url = `${SITE_URL}/today`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reknit//Daily session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:reknit-daily-${pad(t.h)}${pad(t.m)}@reknit.co.uk`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DURATION:PT${mins}M`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${esc(`Reknit: ${safeLabel} session`)}`,
    `DESCRIPTION:${esc(`Your daily Reknit session, about ${mins} minutes.\nOpen it: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0S",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Time for your Reknit session")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
