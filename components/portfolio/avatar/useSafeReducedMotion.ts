"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe reduced-motion check.
 *
 * framer-motion's `useReducedMotion` reads the media query during the client's
 * first render, which disagrees with the server (where it is always false).
 * Anything that uses it to decide *what elements exist* therefore hydrates
 * with a mismatch. This returns false until after mount, so the first client
 * render matches the server and the real value applies on the next paint.
 *
 * Use framer's hook for animation props; use this one for conditional markup.
 */
export function useSafeReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
