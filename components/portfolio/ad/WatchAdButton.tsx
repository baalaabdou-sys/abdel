"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AD_CLIPS } from "./adClips";
import { useAd } from "./AdContext";

/**
 * Launches the film. Nothing about it loads on first paint — the opening shot
 * is only fetched once this button is near the viewport, and the rest waits
 * for a hover or the press itself.
 */
export default function WatchAdButton() {
  const { start, warm, warmth, open } = useAd();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warm("peek");
          io.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [warm]);

  return (
    <div ref={ref} className="mt-10 flex flex-col items-start gap-2">
      <motion.button
        type="button"
        data-cursor-hover
        disabled={open}
        onClick={start}
        onPointerEnter={() => warm("full")}
        onTouchStart={() => warm("full")}
        whileTap={open ? undefined : { scale: 0.97 }}
        className="group relative overflow-hidden rounded-full bg-paper px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-ink transition duration-300 enabled:hover:shadow-[0_0_60px_-12px_rgba(244,241,234,0.85)] disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center gap-2.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[9px] text-paper">
            ▶
          </span>
          Watch ad
        </span>
      </motion.button>
      <p className="text-xs text-haze/80">35 seconds. Sound on, ideally.</p>

      {/*
        The lightweight preview fetch. `metadata` pulls only the header and
        first frames so the film can open instantly without costing every
        visitor the whole reel.
      */}
      {warmth !== "none" && (
        <video
          aria-hidden
          muted
          playsInline
          preload={warmth === "full" ? "auto" : "metadata"}
          src={AD_CLIPS.ad_open.url}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}
      {warmth === "full" && (
        <video
          aria-hidden
          muted
          playsInline
          preload="auto"
          src={AD_CLIPS.ad_dev.url}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}
    </div>
  );
}
