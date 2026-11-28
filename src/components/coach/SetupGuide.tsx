"use client";

import { useEffect, useRef, useState } from "react";

const STEP_MS = 2000;

const CAPTIONS_STANDING = [
  "Prop your phone up at hip height",
  "Step back 2 to 3 metres",
  "Stand side-on, whole body in the picture",
];
const CAPTIONS_LYING = [
  "Prop your phone low, beside where you'll lie",
  "Leave 2 to 3 metres of space",
  "Lie side-on, whole body in the picture",
];

const WHITE = "rgba(255,255,255,0.92)";
const MINT = "#34D3A0";

/** The person, front-on: where they stand and walk back to. */
function PersonFront({ x }: { x: number }) {
  return (
    <g stroke={WHITE} strokeWidth="5" strokeLinecap="round" fill="none">
      <circle cx={x} cy="72" r="10" fill={WHITE} stroke="none" />
      <path d={`M${x} 86V135M${x} 94L${x - 16} 122M${x} 94L${x + 16} 122M${x} 135L${x - 10} 208M${x} 135L${x + 10} 208`} />
    </g>
  );
}

/** The person, side-on: the way the coach wants to see them. */
function PersonSide({ x }: { x: number }) {
  return (
    <g stroke={WHITE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx={x + 3} cy="72" r="10" fill={WHITE} stroke="none" />
      <path d={`M${x + 1} 86L${x - 3} 135M${x + 1} 94L${x + 22} 114M${x - 3} 135L${x + 14} 172L${x + 12} 208M${x - 3} 135L${x - 26} 208`} />
    </g>
  );
}

function PersonLying({ x }: { x: number }) {
  return (
    <g stroke={WHITE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx={x - 62} cy="196" r="9" fill={WHITE} stroke="none" />
      <path d={`M${x - 52} 198H${x} M${x} 198L${x + 24} 176L${x + 50} 198`} />
    </g>
  );
}

/** Four viewfinder corners round a box: "all of you is in the picture". */
function Brackets({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const c = 14;
  return (
    <path
      d={`M${x} ${y + c}V${y}H${x + c} M${x + w - c} ${y}H${x + w}V${y + c} M${x + w} ${y + h - c}V${y + h}H${x + w - c} M${x + c} ${y + h}H${x}V${y + h - c}`}
      stroke={MINT}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  );
}

/**
 * A six-second, three-step picture of how to set up before the camera opens: phone
 * up, step back, stand (or lie) side-on with your whole body in the picture. Plays
 * by itself and can be skipped. The camera and model load behind it.
 */
export function SetupGuide({ posture, onDone }: { posture: "standing" | "lying"; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const lying = posture === "lying";
  const captions = lying ? CAPTIONS_LYING : CAPTIONS_STANDING;
  // The parent re-renders constantly while the camera runs; the timers must not restart each time.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), STEP_MS),
      setTimeout(() => setStep(2), STEP_MS * 2),
      setTimeout(() => doneRef.current(), STEP_MS * 3 + 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const px = 250;
  const tableY = lying ? 190 : 140;
  const phoneY = lying ? 158 : 100;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-night px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
      <div className="flex items-center justify-between">
        <p className="font-sans text-[11px] font-bold tracking-[0.06em] text-white/50 uppercase">Quick set-up</p>
        <button type="button" onClick={() => doneRef.current()} className="rounded-full bg-white/15 px-4 py-1.5 font-sans text-xs font-bold">
          Skip
        </button>
      </div>

      <div className="flex flex-1 items-center">
        <svg viewBox="0 0 320 240" className="w-full" role="img" aria-label={captions[step]}>
          {/* ground */}
          <path d="M8 210H312" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />

          {/* what the phone can see */}
          <path
            d={`M62 ${phoneY + 16}L304 36V214L62 ${phoneY + 24}Z`}
            fill={MINT}
            style={{ opacity: step === 0 ? 0.06 : 0.1, transition: "opacity .5s" }}
          />

          {/* phone on a stand */}
          <g>
            <path d={`M40 ${tableY}H84M46 ${tableY}V210M78 ${tableY}V210`} stroke={WHITE} strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="44" y={phoneY} width="26" height="40" rx="5" fill="#0E2A26" stroke={WHITE} strokeWidth="3" />
            <circle cx="57" cy={phoneY + 6} r="2.2" fill={MINT} />
          </g>

          {/* distance */}
          <g style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity .6s" }}>
            <path d={`M86 ${lying ? 150 : 52}H${px - 40}`} stroke={MINT} strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
            <path d={`M86 ${lying ? 144 : 46}L80 ${lying ? 150 : 52}L86 ${lying ? 156 : 58}M${px - 40} ${lying ? 144 : 46}L${px - 34} ${lying ? 150 : 52}L${px - 40} ${lying ? 156 : 58}`} stroke={MINT} strokeWidth="2" strokeLinecap="round" fill="none" />
            <text x={(86 + px - 40) / 2} y={lying ? 138 : 38} textAnchor="middle" fill={MINT} fontSize="13" fontWeight="700" fontFamily="inherit">
              2 to 3 m
            </text>
          </g>

          {/* the person walks back, then turns side-on */}
          <g
            style={{
              opacity: step >= 1 && !lying ? 1 : 0,
              transform: step >= 1 ? "translateX(0)" : "translateX(-90px)",
              transition: "opacity .6s, transform 1.3s ease-out",
            }}
          >
            <g style={{ opacity: step >= 2 ? 0 : 1, transition: "opacity .5s" }}>
              <PersonFront x={px} />
            </g>
            <g style={{ opacity: step >= 2 ? 1 : 0, transition: "opacity .5s" }}>
              <PersonSide x={px} />
            </g>
          </g>
          {lying && (
            <g style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity .6s" }}>
              <PersonLying x={px - 10} />
            </g>
          )}

          {/* whole body in the picture */}
          <g style={{ opacity: step >= 2 ? 1 : 0, transition: "opacity .6s" }}>
            {lying ? <Brackets x={px - 84} y={158} w={150} h={58} /> : <Brackets x={px - 44} y={52} w={88} h={166} />}
          </g>
        </svg>
      </div>

      <div className="text-center">
        <p key={step} className="font-display text-[22px] leading-tight font-extrabold">
          {captions[step]}
        </p>
        <p className="mt-1.5 font-sans text-xs text-white/55">Then get into position and hold.</p>
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-mint" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
