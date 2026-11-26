"use client";

import { useEffect } from "react";

/** Registers the offline service worker. Production only, so dev reloads are never served stale. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[sw] registration failed", err));
  }, []);
  return null;
}
