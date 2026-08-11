"use client";

import { useEffect, useState } from "react";

export type Tier = "full" | "reduced" | "minimal";

export type Capability = {
  tier: Tier;
  isTouch: boolean;
  reducedMotion: boolean;
  /** Working width for the chroma-key canvas. */
  keyWidth: number;
  /** Minimum ms between chroma-key frames (0 = uncapped). */
  keyInterval: number;
  /** How many simultaneous character instances the device should render. */
  maxClones: number;
  /** Multiplier for particle/floater counts. */
  particles: number;
};

const TIERS: Record<Tier, Omit<Capability, "tier" | "isTouch" | "reducedMotion">> = {
  full: { keyWidth: 480, keyInterval: 0, maxClones: 5, particles: 1 },
  reduced: { keyWidth: 420, keyInterval: 42, maxClones: 3, particles: 0.6 },
  minimal: { keyWidth: 300, keyInterval: 66, maxClones: 1, particles: 0.3 },
};

/**
 * Grades the device once on mount so every effect can scale itself instead of
 * being switched off wholesale. A weak phone still gets the experience — just
 * fewer clones, fewer particles and a cheaper chroma key.
 */
export function useCapability(): Capability {
  const [cap, setCap] = useState<Capability>(() => ({
    tier: "reduced",
    isTouch: false,
    reducedMotion: false,
    ...TIERS.reduced,
  }));

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nav = navigator as Navigator & { deviceMemory?: number };
    const mem = nav.deviceMemory ?? (isTouch ? 4 : 8);
    const cores = navigator.hardwareConcurrency ?? (isTouch ? 4 : 8);
    const small = window.innerWidth < 480;

    let tier: Tier;
    if (mem <= 3 || cores <= 3) tier = "minimal";
    else if (isTouch || small || mem <= 6 || cores <= 5) tier = "reduced";
    else tier = "full";

    setCap({ tier, isTouch, reducedMotion, ...TIERS[tier] });
  }, []);

  return cap;
}
