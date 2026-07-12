type DayStatus = "done" | "missed" | "today" | "upcoming";

const week: { label: string; status: DayStatus }[] = [
  { label: "M", status: "done" },
  { label: "T", status: "done" },
  { label: "W", status: "missed" },
  { label: "T", status: "done" },
  { label: "F", status: "done" },
  { label: "S", status: "today" },
  { label: "S", status: "upcoming" },
];

const dotStyles: Record<DayStatus, string> = {
  done: "bg-moss",
  missed: "bg-coral/70",
  today: "bg-amber ring-2 ring-amber/40 ring-offset-2 ring-offset-paper",
  upcoming: "bg-mist",
};

export function AdherenceDots() {
  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-sm font-semibold text-ink">This week</h3>
        <span className="font-mono text-xs text-ink/50">5/7 days</span>
      </div>
      <div className="mt-3 flex justify-between">
        {week.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${dotStyles[day.status]}`} />
            <span className="font-sans text-[10px] text-ink/50">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
