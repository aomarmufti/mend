"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasChosenCondition } from "@/lib/activeCondition";

/**
 * The chosen condition lives in localStorage, which the server cannot read, so
 * this routing decision has to happen on the client. Renders a bare background
 * rather than a placeholder the user would see for a single frame.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(hasChosenCondition() ? "/today" : "/start");
  }, [router]);

  return <div className="min-h-screen bg-paper" />;
}
