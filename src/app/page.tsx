"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, readProfile } from "@/lib/profile";

/**
 * Profile state lives in localStorage, which the server cannot read, so the
 * routing decision happens on the client. Renders a bare background rather
 * than a placeholder the user would see for a single frame.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const profile = readProfile();
    const target = homeFor(profile);
    // A first-time visitor in a web browser gets the landing page. The home-screen
    // app and the iPhone app (standalone, or a native shell) go straight in.
    const inApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      "Capacitor" in window;
    router.replace(target === "/welcome" && !inApp ? "/landing" : target);
  }, [router]);

  return <div className="min-h-screen" />;
}
