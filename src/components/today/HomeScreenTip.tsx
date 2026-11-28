"use client";

import { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/kit";
import { isIOS } from "@/lib/device";
import { subscribe } from "@/lib/store";
import { readTips, setTips } from "@/lib/tips";

const noop = () => () => {};

function dismissed(): boolean {
  return !!readTips().a2hs;
}

/**
 * On an iPhone in Safari, suggests adding Reknit to the Home Screen: one tap to open,
 * full screen, no browser bars. Hidden once added (or dismissed), in the installed app,
 * and everywhere that isn't an iPhone or iPad.
 */
export function HomeScreenTip() {
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  const eligible = useSyncExternalStore(
    noop,
    () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true ||
        "Capacitor" in window;
      return isIOS() && !standalone;
    },
    () => false,
  );
  if (hidden || !eligible) return null;
  return (
    <Card className="bg-white p-4">
      <p className="font-sans text-sm font-extrabold">Keep Reknit one tap away</p>
      <p className="mt-1 font-sans text-xs text-ink/65">
        Tap the Share button in Safari, then <b>Add to Home Screen</b>. It opens full screen like an app, ready for tomorrow&apos;s session.
      </p>
      <button
        type="button"
        onClick={() => setTips({ a2hs: true })}
        className="mt-2 font-sans text-xs font-bold text-ink/50"
      >
        Not now
      </button>
    </Card>
  );
}
