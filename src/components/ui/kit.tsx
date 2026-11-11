/**
 * Soft Vitality building blocks: white cards on the mint-to-sky wash, pill
 * badges, a gradient primary button. Kept tiny on purpose — these are the
 * handful of shapes every screen in the flow is built from.
 */

import type { ReactNode } from "react";

export const card = "rounded-[22px] bg-white/90 shadow-[0_8px_24px_rgba(60,100,120,0.10)]";
export const btnPrimary =
  "flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-mint to-sky px-4 py-3.5 font-sans text-sm font-bold text-white shadow-[0_8px_20px_rgba(52,181,138,0.30)] transition active:scale-[0.99] disabled:opacity-50";
export const btnSecondary =
  "flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3.5 font-sans text-sm font-bold text-ink shadow-[0_4px_14px_rgba(60,100,120,0.12)] transition active:scale-[0.99]";
export const btnDark =
  "flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3.5 font-sans text-sm font-bold text-white transition active:scale-[0.99]";
export const eyebrow = "font-sans text-[11px] font-bold tracking-[0.06em] text-ink/50 uppercase";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${card} p-4 ${className}`}>{children}</div>;
}

export type Tone = "ok" | "warn" | "soft" | "dark" | "glass";

const TONE: Record<Tone, string> = {
  ok: "bg-success-soft text-success",
  warn: "bg-amber-soft text-amber",
  soft: "bg-chip text-ink/60",
  dark: "bg-ink/80 text-white",
  glass: "bg-white/25 text-white backdrop-blur",
};

export function Pill({
  tone = "soft",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[11px] font-bold ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-[#E3EEF1] ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-mint to-sky transition-all"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Ring({
  pct,
  size = 74,
  stroke = 6,
  color = "#2FA67F",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = size / 2 - stroke;
  const L = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3EEF1" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${(L * Math.max(0, Math.min(100, pct))) / 100} ${L}`}
          className="transition-[stroke-dasharray] duration-150"
        />
      </svg>
      <span className="relative font-sans font-extrabold text-ink" style={{ fontSize: size / 3.4 }}>
        {children}
      </span>
    </div>
  );
}

export function AppleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.9zM14.2 5.8c.6-.8 1.1-1.9.9-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z" />
    </svg>
  );
}

export function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z" />
      <path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7C4.4 19.6 7.9 22 12 22z" />
      <path fill="#FBBC05" d="M6.2 13.6c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.1H2.7C2 8.5 1.6 10.2 1.6 12s.4 3.5 1.1 4.9l3.5-3.3z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.9.5 4 1.6l3-3C17.2 2.9 14.8 2 12 2 7.9 2 4.4 4.4 2.7 7.1l3.5 2.7C7 7.9 9.3 6.1 12 6.1z" />
    </svg>
  );
}

export function LockIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TickDot({ done, className = "" }: { done: boolean; className?: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
        done ? "bg-mint-deep text-white" : "bg-[#E7EDF0] text-ink/40"
      } ${className}`}
      aria-hidden="true"
    >
      {done ? "✓" : ""}
    </span>
  );
}
