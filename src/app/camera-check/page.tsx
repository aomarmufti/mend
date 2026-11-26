"use client";

import dynamic from "next/dynamic";

// Touches navigator.mediaDevices and WebGL, so browser only.
const CameraCheck = dynamic(() => import("@/components/coach/CameraCheck").then((m) => m.CameraCheck), {
  ssr: false,
});

export default function CameraCheckPage() {
  return <CameraCheck />;
}
