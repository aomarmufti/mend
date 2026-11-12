"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The server's clock is not the visitor's, so this reads the browser's.
export function Greeting() {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => greetingForHour(new Date().getHours()),
    () => "Hello",
  );
  return <>{label}</>;
}
