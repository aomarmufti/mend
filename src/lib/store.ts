/**
 * One change signal for everything the prototype keeps in localStorage.
 *
 * The screens read storage through `useSyncExternalStore`. With a no-op
 * subscribe they only ever saw a write if something else happened to
 * re-render them, so logging pain on Today left the streak, the week strip
 * and the session card stale until a reload. Every writer calls `notify()`,
 * and every reader subscribes here, so a write anywhere repaints everything
 * that depends on it, including other open tabs via the `storage` event.
 */

const EVENT = "mend:store";

export function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota: the app still works, it just won't remember */
  }
  notify();
}

/**
 * A snapshot function that returns the same reference until the raw stored
 * string changes. `useSyncExternalStore` loops if getSnapshot returns a fresh
 * object on every call.
 */
export function cachedSnapshot<T>(keys: string[], compute: () => T, extra?: () => string): () => T {
  let cacheKey: string | null = null;
  let cacheValue: T;
  return () => {
    const key = keys.map((k) => readRaw(k) ?? "").join("\u0000") + "|" + (extra ? extra() : "");
    if (cacheKey !== key) {
      cacheKey = key;
      cacheValue = compute();
    }
    return cacheValue;
  };
}
