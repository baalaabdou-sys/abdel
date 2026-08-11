"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAvatarContext } from "../avatar/AvatarContext";
import { useRebuild } from "./RebuildContext";
import { setSoundEnabled, soundEnabled } from "./sound";

/**
 * The only way into the rebuild sequence. It never fires on its own — the
 * visitor has to decide to press it.
 */
export default function BreakButton() {
  const { start, running, played } = useRebuild();
  const { warmClip } = useAvatarContext();
  const [sound, setSound] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setSound(soundEnabled()), []);

  // The four sequence-only clips are lazy, so they cost nothing to visitors
  // who never scroll here. Buffer them once the button is in reach.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        (["permission_smirk", "reach_pull", "slam_down", "sign_off"] as const).forEach(warmClip);
        io.disconnect();
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [warmClip]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <div ref={ref} className="mt-10 flex flex-wrap items-center gap-3">
      <motion.button
        type="button"
        data-cursor-hover
        disabled={running}
        onClick={start}
        whileTap={running ? undefined : { scale: 0.96 }}
        aria-label={running ? "Rebuild sequence playing" : "Break the portfolio"}
        className="group relative overflow-hidden rounded-full border border-accent/60 bg-ink/70 px-6 py-3 text-sm font-semibold text-paper transition duration-300 enabled:hover:border-accent enabled:hover:shadow-[0_0_40px_-8px_rgba(139,124,255,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-10">
          {running ? "Rebuilding…" : played ? "Okay… do it again" : "Break the portfolio"}
        </span>
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/25 to-transparent transition-transform duration-700 group-enabled:group-hover:translate-x-full" />
      </motion.button>

      <button
        type="button"
        data-cursor-hover
        onClick={toggleSound}
        aria-pressed={sound}
        className="rounded-full border border-ink-line px-3 py-2 text-xs text-haze transition hover:border-accent/60 hover:text-paper"
      >
        {sound ? "Sound on" : "Sound off"}
      </button>

      <p className="text-xs text-haze/70">Nothing actually breaks. Promise.</p>
    </div>
  );
}
