"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ChromaClip from "../../avatar/ChromaClip";
import type { Capability } from "../../avatar/useCapability";

/**
 * Between the acts.
 *
 * Act 1 does not run on into Act 2 — the visitor has to choose it. The screen
 * they choose on is already coming apart at the edges, and the Continue button
 * does not behave: it drifts away from the pointer and refuses the first
 * press. He notices before you do.
 */
export default function Interstitial({
  cap,
  portrait,
  onContinue,
  onReplayAct1,
  onClose,
}: {
  cap: Capability;
  portrait: boolean;
  onContinue: () => void;
  onReplayAct1: () => void;
  onClose: () => void;
}) {
  const [dodges, setDodges] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [glitch, setGlitch] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  // Reality is not stable on this screen.
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 140);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  /**
   * The button slides out of the way of a pointer twice, then gives in. On
   * touch there is no hover to dodge, so the first tap is the one it refuses.
   */
  const evade = () => {
    if (dodges >= 2) return;
    setDodges((d) => d + 1);
    setOffset({ x: (Math.random() * 2 - 1) * (portrait ? 70 : 190), y: (Math.random() * 2 - 1) * 46 });
  };

  const press = () => {
    if (dodges < 1) {
      // "…that did nothing."
      evade();
      return;
    }
    onContinue();
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-black/80 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* he is still there, watching it misbehave */}
      <div className="pointer-events-none absolute bottom-0 right-[4%] h-[46%] opacity-90 sm:right-[10%] sm:h-[58%]">
        <ChromaClip clip={dodges > 0 ? "confused_fix" : "idle_loop"} cap={cap} className="h-full w-auto" />
      </div>

      <motion.h2
        className="relative text-center font-display text-[9vw] font-bold leading-none tracking-tight text-paper sm:text-[4.2vw]"
        animate={glitch ? { x: [0, -4, 3, 0], skewX: [0, 3, -2, 0] } : {}}
        transition={{ duration: 0.14 }}
      >
        READY TO BREAK REALITY?
        {glitch && (
          <>
            <span className="absolute inset-0 translate-x-[3px] text-accent opacity-70" aria-hidden>
              READY TO BREAK REALITY?
            </span>
            <span className="absolute inset-0 -translate-x-[3px] text-accent-soft opacity-70" aria-hidden>
              READY TO BREAK REALITY?
            </span>
          </>
        )}
      </motion.h2>

      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <motion.button
          ref={btn}
          type="button"
          data-cursor-hover
          onPointerEnter={portrait ? undefined : evade}
          onClick={press}
          animate={{ x: offset.x, y: offset.y }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="rounded-full bg-paper px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-ink transition hover:shadow-[0_0_60px_-10px_rgba(244,241,234,0.9)]"
        >
          Continue
        </motion.button>
        <button
          type="button"
          data-cursor-hover
          onClick={onReplayAct1}
          className="rounded-full border border-paper/30 px-6 py-3 text-sm text-paper transition hover:border-paper/80"
        >
          Replay Act 1
        </button>
        <button
          type="button"
          data-cursor-hover
          onClick={onClose}
          className="rounded-full px-5 py-3 text-sm text-haze underline-offset-4 transition hover:text-paper hover:underline"
        >
          Back to portfolio
        </button>
      </div>

      {dodges > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-[11px] tracking-[0.3em] text-accent-soft"
        >
          {dodges === 1 ? "…try again" : "ok. it will hold this time"}
        </motion.p>
      )}
    </motion.div>
  );
}
