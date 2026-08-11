"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAvatarContext } from "../avatar/AvatarContext";
import { useBrain } from "./BrainContext";

/** The way in. Deliberately says very little. */
export default function EnterBrainButton() {
  const { enter, open } = useBrain();
  const { warmClip } = useAvatarContext();
  const ref = useRef<HTMLDivElement>(null);

  // Buffer the mind clips only once someone is near the button.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        (
          [
            "brain_invite",
            "brain_sit",
            "brain_arrange",
            "brain_present",
            "brain_hide",
            "brain_pull",
            "brain_catch",
          ] as const
        ).forEach(warmClip);
        io.disconnect();
      },
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [warmClip]);

  return (
    <div ref={ref} className="mt-14 flex flex-col items-start gap-2">
      <motion.button
        type="button"
        data-cursor-hover
        disabled={open}
        onClick={enter}
        whileTap={open ? undefined : { scale: 0.97 }}
        className="group relative overflow-hidden rounded-full border border-accent-soft/50 bg-ink/70 px-7 py-3.5 text-sm font-semibold text-paper transition duration-300 enabled:hover:border-accent-soft enabled:hover:shadow-[0_0_50px_-10px_rgba(94,230,208,0.75)] disabled:opacity-50"
      >
        <span className="relative z-10">Enter my brain</span>
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(94,230,208,0.35),transparent_60%)]"
          animate={{ opacity: [0.25, 0.75, 0.25] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.button>
      <p className="text-xs text-haze/80">See what I&apos;m thinking about.</p>
    </div>
  );
}
