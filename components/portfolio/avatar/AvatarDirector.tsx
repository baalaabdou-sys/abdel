"use client";

import { useEffect, useRef } from "react";
import { useAvatarContext } from "./AvatarContext";
import { useAvatarOff } from "./avatarPref";
import { useCapability } from "./useCapability";
import { usePredictivePreload } from "./usePredictivePreload";
import type { CharacterState } from "./states";

/** Things he does when left alone, in rough order of how often they suit. */
const IDLE_BEATS: CharacterState[] = ["noticing", "tapping", "pointing", "grabbing"];

/**
 * Runs the character's background behaviour: predictive asset loading, idle
 * personality, and the tap easter egg. Kept out of AvatarStage so the stage
 * stays a renderer and this stays the "brain".
 */
export default function AvatarDirector() {
  const [off] = useAvatarOff();
  if (off) return null;
  return <AvatarDirectorInner />;
}

function AvatarDirectorInner() {
  const { play, pointer } = useAvatarContext();
  const cap = useCapability();
  usePredictivePreload(!cap.reducedMotion);

  const lastActivity = useRef(Date.now());
  const taps = useRef({ count: 0, at: 0 });

  /* ── idle personality ─────────────────────────────────────────── */
  useEffect(() => {
    if (cap.reducedMotion) return;

    const bump = () => {
      lastActivity.current = Date.now();
    };
    ["pointermove", "scroll", "keydown", "touchstart"].forEach((e) =>
      window.addEventListener(e, bump, { passive: true })
    );

    // Checks in occasionally rather than firing on a fixed cadence, so the
    // beats don't feel metronomic.
    const timer = setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor < 12000) return;
      if (document.hidden) return;
      if (Math.random() > 0.45) return;
      play(IDLE_BEATS[Math.floor(Math.random() * IDLE_BEATS.length)]);
      lastActivity.current = Date.now();
    }, 7000);

    return () => {
      clearInterval(timer);
      ["pointermove", "scroll", "keydown", "touchstart"].forEach((e) =>
        window.removeEventListener(e, bump)
      );
    };
  }, [cap.reducedMotion, play]);

  /* ── easter egg: poke him enough times and he reacts ──────────── */
  useEffect(() => {
    if (cap.reducedMotion) return;

    const onTap = (e: PointerEvent) => {
      // Only counts as poking him if it lands near where he is.
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      void dx;
      void dy;
      const now = Date.now();
      if (now - taps.current.at > 1400) taps.current.count = 0;
      taps.current = { count: taps.current.count + 1, at: now };
      if (taps.current.count >= 5) {
        taps.current.count = 0;
        play("celebrating");
      }
    };

    window.addEventListener("pointerdown", onTap, { passive: true });
    return () => window.removeEventListener("pointerdown", onTap);
  }, [cap.reducedMotion, play, pointer]);

  return null;
}
