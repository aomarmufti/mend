export function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[874px] w-[402px] rounded-[62px] bg-pine p-[14px] shadow-2xl">
      <div className="relative h-full w-full overflow-hidden rounded-[48px] bg-paper">
        <div className="pointer-events-none absolute top-[11px] left-1/2 z-50 h-[32px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
        <div className="h-full w-full overflow-y-auto">{children}</div>
      </div>

      <div className="absolute -left-[3px] top-[130px] h-[32px] w-[3px] rounded-l-sm bg-pine/80" />
      <div className="absolute -left-[3px] top-[180px] h-[60px] w-[3px] rounded-l-sm bg-pine/80" />
      <div className="absolute -left-[3px] top-[250px] h-[60px] w-[3px] rounded-l-sm bg-pine/80" />
      <div className="absolute -right-[3px] top-[200px] h-[80px] w-[3px] rounded-r-sm bg-pine/80" />
    </div>
  );
}
