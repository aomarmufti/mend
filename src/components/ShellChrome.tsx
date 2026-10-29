"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DeviceFrame } from "@/components/DeviceFrame";

/**
 * Presentational-only wrapper. The app underneath is a normal responsive
 * web page; this just optionally frames it for screenshots/demos. Hidden on
 * the focused session-runner route, which has no chrome of its own.
 */
export function ShellChrome({ children }: { children: React.ReactNode }) {
  const [framed, setFramed] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const pathname = usePathname();

  // Opt-in only (?demo=1). It is a fixed-position button that otherwise lands
  // on top of the bottom nav's last tab and makes it untappable on every phone.
  useEffect(() => {
    setShowToggle(new URLSearchParams(window.location.search).has("demo"));
  }, []);
  const isFocusedFlow = pathname?.startsWith("/session");

  if (isFocusedFlow) {
    return <div className="min-h-screen bg-paper">{children}</div>;
  }

  return (
    <div className={framed ? "min-h-screen bg-mist py-10" : "min-h-screen bg-paper"}>
      {framed ? <DeviceFrame>{children}</DeviceFrame> : children}

      {showToggle && (
      <button
        type="button"
        onClick={() => setFramed((f) => !f)}
        className="fixed right-4 bottom-4 z-[100] rounded-full border border-mist bg-pine px-4 py-2 font-sans text-xs font-medium text-paper shadow-lg transition hover:opacity-90"
      >
        {framed ? "Exit demo frame" : "Demo frame"}
      </button>
      )}
    </div>
  );
}
