"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// A statically-prerendered page can't know the visitor's local time of day at
// build time, and the server's clock/timezone isn't the visitor's anyway —
// so this reads the browser's local clock instead of computing on the server.
export function Greeting() {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => greetingForHour(new Date().getHours()),
    () => "Hello"
  );

  return <>{label}</>;
}
