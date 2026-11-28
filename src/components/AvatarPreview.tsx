"use client";

import { useEffect, useRef } from "react";
import { drawAvatar, neutralRig, type AvatarLook } from "@/components/coach/avatar";

/** The avatar standing still, so a look can be chosen and seen before using it. */
export function AvatarPreview({ look, className = "" }: { look: AvatarLook; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawAvatar(ctx, canvas.width, canvas.height, neutralRig(canvas.width, canvas.height), look, true);
  }, [look]);
  return <canvas ref={ref} width={240} height={360} className={className} role="img" aria-label="Your avatar" />;
}
