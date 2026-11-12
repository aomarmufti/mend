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
    router.replace(homeFor(readProfile()));
  }, [router]);

  return <div className="min-h-screen" />;
}
