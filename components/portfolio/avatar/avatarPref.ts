"use client";

import { useEffect, useState } from "react";

/**
 * Whether the visitor has switched the character off.
 *
 * He is the most expensive thing on the page — a per-pixel chroma key every
 * frame, on top of a video decode — and on a weak phone that is felt rather
 * than measured. The capability tiers scale him down; this is the escape
 * hatch for someone whose device still cannot carry him.
 *
 * Kept in localStorage rather than a session: a phone that struggled once
 * will struggle again, and being asked to turn him off on every visit would
 * be its own kind of rude.
 */

const KEY = "avatar-off";

type Listener = (off: boolean) => void;
const listeners = new Set<Listener>();

export function avatarOff() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Private mode. He stays on; the preference simply cannot be stored.
    return false;
  }
}

export function setAvatarOff(off: boolean) {
  try {
    window.localStorage.setItem(KEY, off ? "1" : "0");
  } catch {
    /* private mode — the toggle just won't persist */
  }
  // Every mounted reader flips on the same tick, so the stage and the button
  // can never disagree about whether he is on.
  listeners.forEach((cb) => cb(off));
}

/**
 * Reads the preference. Starts false on both server and first client render
 * — the stored value is only applied in the effect — so hydration always
 * matches and the toggle never flashes the wrong label.
 */
export function useAvatarOff(): [boolean, (off: boolean) => void] {
  const [off, setOff] = useState(false);

  useEffect(() => {
    setOff(avatarOff());
    listeners.add(setOff);
    return () => {
      listeners.delete(setOff);
    };
  }, []);

  return [off, setAvatarOff];
}
