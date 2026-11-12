"use client";

import { useRouter } from "next/navigation";
import { AppleIcon, GoogleIcon, btnDark, btnSecondary } from "@/components/ui/kit";
import { signIn, type Provider } from "@/lib/profile";

/**
 * Prototype sign-in. Records which provider was chosen and carries on to
 * setup; there is no identity provider behind it yet (see lib/profile.ts).
 */
export function SignInButtons({
  next = "/start",
  compact = false,
}: {
  next?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const go = (provider: Provider) => {
    signIn(provider);
    router.push(next);
  };
  const size = compact ? " py-2.5 text-xs" : "";
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2.5"}>
      <button type="button" onClick={() => go("apple")} className={btnDark + size}>
        <AppleIcon /> {compact ? "Apple" : "Continue with Apple"}
      </button>
      <button
        type="button"
        onClick={() => go("google")}
        className={btnSecondary + size + (compact ? " ring-1 ring-[#DCE6EA]" : "")}
      >
        <GoogleIcon /> {compact ? "Google" : "Continue with Google"}
      </button>
    </div>
  );
}
