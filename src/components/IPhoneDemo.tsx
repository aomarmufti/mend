"use client";

import { useEffect, useRef, useState } from "react";

// iPhone 16 Pro logical viewport.
const W = 393;
const H = 852;
const BEZEL = 12;
const STATUS_BAR = 54;
const HOME_INSET = 22; // stands in for the 34pt safe-area at the bottom

const SCREENS = [
  { label: "Start", path: "/start" },
  { label: "Today", path: "/today" },
  { label: "Plan", path: "/plan" },
  { label: "Progress", path: "/progress" },
  { label: "Coach", path: "/coach" },
];

/**
 * Shows the real app (loaded in an iframe, so media queries, routing and the
 * camera flows all behave as they do on a phone) inside an iPhone frame.
 * Demo-only: lives at /iphone and is not linked from the app.
 */
export function IPhoneDemo() {
  const [src, setSrc] = useState("/");
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fit = () => {
      const fullH = H + BEZEL * 2 + 48;
      setScale(Math.min(1, window.innerHeight / fullH));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const reset = () => {
    try {
      frame.current?.contentWindow?.localStorage.clear();
    } catch {
      /* cross-origin or blocked storage: just reload */
    }
    setSrc("/?r=" + Date.now());
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#E9EEEB] py-6">
      <div
        style={{
          width: (W + BEZEL * 2) * scale,
          height: (H + BEZEL * 2) * scale,
        }}
      >
        <div
          className="relative origin-top-left rounded-[62px] bg-[#2B2D2F] p-[12px] shadow-[0_30px_80px_rgba(30,42,50,0.35),inset_0_0_0_2px_#4A4D50]"
          style={{
            width: W + BEZEL * 2,
            height: H + BEZEL * 2,
            transform: `scale(${scale})`,
          }}
        >
          {/* side buttons */}
          <span className="absolute -left-[3px] top-[120px] h-[30px] w-[3px] rounded-l bg-[#3B3E41]" />
          <span className="absolute -left-[3px] top-[170px] h-[56px] w-[3px] rounded-l bg-[#3B3E41]" />
          <span className="absolute -left-[3px] top-[240px] h-[56px] w-[3px] rounded-l bg-[#3B3E41]" />
          <span className="absolute -right-[3px] top-[190px] h-[90px] w-[3px] rounded-r bg-[#3B3E41]" />

          <div className="relative h-full w-full overflow-hidden rounded-[50px] bg-[#F6FAF7]">
            {/* status bar */}
            <div
              className="absolute inset-x-0 top-0 z-20 flex items-end justify-between px-9 pb-[10px] font-sans text-[16px] font-semibold text-[#1E2A32]"
              style={{ height: STATUS_BAR }}
            >
              <span>9:41</span>
              <span className="flex items-center gap-[6px]">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden>
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                  <rect x="10" y="3" width="3" height="9" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden>
                  <path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.2-1.3A10.6 10.6 0 0 0 8.5.6C5.7.6 3.2 1.7 1.3 3.5l1.2 1.3a8.7 8.7 0 0 1 6-2.4Zm0 3.6c1.4 0 2.6.5 3.600 1.400L13.300 6A7 7 0 0 0 8.500 4.200 7 7 0 0 0 3.700 6l1.200 1.400c1-.9 2.200-1.400 3.600-1.400Zm0 3.500c.7 0 1.300.3 1.800.7L8.500 12 6.700 10.200c.5-.4 1.100-.7 1.800-.7Z" />
                </svg>
                <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden>
                  <rect x="0.5" y="0.5" width="22" height="12" rx="3.800" fill="none" stroke="currentColor" opacity="0.4" />
                  <rect x="2" y="2" width="19" height="9" rx="2.500" fill="currentColor" />
                  <path d="M24 4.500v4c.8-.3 1.500-1.100 1.500-2s-.7-1.700-1.500-2Z" fill="currentColor" opacity="0.5" />
                </svg>
              </span>
            </div>

            {/* dynamic island */}
            <div className="absolute top-[11px] left-1/2 z-30 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />

            <iframe
              ref={frame}
              key={src}
              title="Reknit app"
              src={src}
              allow="camera; microphone; autoplay"
              className="absolute left-0 block border-0 bg-[#F6FAF7]"
              style={{
                top: STATUS_BAR,
                width: W,
                height: H - STATUS_BAR - HOME_INSET,
              }}
            />

            {/* home indicator */}
            <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-30 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-[#1E2A32]" />
          </div>
        </div>
      </div>

      <nav
        aria-label="Demo screens"
        className="flex flex-wrap items-center justify-center gap-2 px-4 font-sans text-xs"
      >
        {SCREENS.map((s) => (
          <button
            key={s.path}
            type="button"
            onClick={() => setSrc(s.path)}
            className="rounded-full border border-[#E3EBEF] bg-white px-3.5 py-1.5 font-medium text-[#1E2A32] shadow-sm hover:bg-[#F6FAF7]"
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#1E8A68] px-3.5 py-1.5 font-medium text-white shadow-sm hover:opacity-90"
        >
          Reset demo
        </button>
      </nav>
    </main>
  );
}
