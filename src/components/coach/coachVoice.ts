"use client";

/**
 * Spoken + tonal feedback for the camera coach.
 *
 * The coach's visual output — timer ring, rep counter, cue chip — is rendered
 * on a screen the user usually cannot see. Four of the six coached stretches
 * are performed lying on your back, side-on, with the phone far enough away to
 * frame a whole body. Feedback that only exists on that screen is feedback
 * nobody receives, so the cues are spoken as well as drawn.
 *
 * Everything here degrades silently: a browser without speechSynthesis or
 * AudioContext loses the audio channel and keeps the visual one.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    // Autoplay policy parks the context until a gesture; resuming is a no-op
    // once it is already running.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A short sine blip. Used to mark state changes the user should feel, not read. */
export function tone(frequency: number, ms = 140, gain = 0.09) {
  const c = audio();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const vol = c.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    // Ramp rather than switch, so it reads as a chime instead of a click.
    vol.gain.setValueAtTime(0, c.currentTime);
    vol.gain.linearRampToValueAtTime(gain, c.currentTime + 0.015);
    vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    osc.connect(vol).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + ms / 1000 + 0.02);
  } catch {
    /* no audio output available — the visual cue still stands */
  }
}

export function speak(text: string, { interrupt = true } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (interrupt) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.lang = "en-GB";
    window.speechSynthesis.speak(u);
  } catch {
    /* speech unavailable — the on-screen cue is unchanged */
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to cancel */
  }
}

/** Short buzz where the device supports it. Reaches a user who has the sound off. */
export function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

export const VOICE = {
  enteredPosition: () => {
    tone(660, 120);
    speak("That's it. Hold.");
  },
  /** Spoken once per remaining second over the final stretch of a hold. */
  countdown: (secondsLeft: number) => speak(String(secondsLeft)),
  repBanked: (repNumber: number, remaining: number) => {
    tone(880, 180);
    buzz(120);
    speak(
      remaining > 0
        ? `Good job. Full hold. Release, then get set for the next one.`
        : `Good job. Full hold — that's the set done.`,
    );
  },
  releasedEarly: () => {
    tone(320, 220);
    speak("Lost the position. Get back into it when you're ready.");
  },
  partialSet: (heldSec: number, targetSec: number, remaining: number) => {
    tone(760, 150);
    buzz(90);
    speak(
      `Counted. You held ${heldSec} of ${targetSec} seconds, so that's a partial set.` +
        (remaining > 0 ? " Next one when you're ready." : " That's the last one."),
    );
  },
  notDeepEnough: () => {
    tone(320, 160);
    speak("Not quite far enough. Go a little deeper next one.");
  },
  unreadable: () => speak("I can't see you — check your whole body is in frame."),
};
