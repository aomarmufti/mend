import { buildReminderIcs, parseTime } from "@/lib/calendar";

export const runtime = "nodejs";

/**
 * GET /api/reminder?time=08:00&label=Knee&mins=9&d=2026-11-28
 * Returns a daily repeating calendar event. Served as text/calendar so iPhone
 * Safari offers "Add to Calendar" straight away. Nothing is stored.
 */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const time = q.get("time");
  if (!parseTime(time)) return new Response("Invalid time", { status: 400 });
  const d = q.get("d");
  const today = new Date().toISOString().slice(0, 10);
  const startDate = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  try {
    const ics = buildReminderIcs({
      time: time as string,
      label: q.get("label") ?? "Daily",
      minutes: Number(q.get("mins")) || 10,
      startDate,
    });
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="reknit-daily.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
}
