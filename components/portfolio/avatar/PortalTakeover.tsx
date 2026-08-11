"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChromaClip from "./ChromaClip";
import { useCapability } from "./useCapability";

export type TakeoverOrigin = { x: number; y: number; w: number; h: number };

/**
 * The project transition, as a full-screen event rather than a card effect.
 *
 * The card the visitor clicked expands from its own position to fill the
 * viewport, a portal blooms out of it, and the character steps through at
 * near-full height before the navigation lands. On a phone this is the whole
 * screen, which makes it the most cinematic moment on the site.
 */
export default function PortalTakeover({
  origin,
  label,
}: {
  origin: TakeoverOrigin | null;
  label?: string;
}) {
  const cap = useCapability();
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const set = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  if (cap.reducedMotion) return null;

  return (
    <AnimatePresence>
      {origin && vw > 0 && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[80]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          {/* The card itself, growing from where it sat to the whole screen. */}
          <motion.div
            className="absolute rounded-2xl border border-accent/60 bg-gradient-to-br from-accent/25 via-ink to-accent-soft/15"
            initial={{ left: origin.x, top: origin.y, width: origin.w, height: origin.h, borderRadius: 16 }}
            animate={{
              left: 0,
              top: 0,
              width: vw,
              height: vh,
              borderRadius: 0,
              transition: { duration: 0.85, ease: [0.7, 0, 0.2, 1] },
            }}
          />

          {/* Energy blooming out of the middle. */}
          <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ translateX: "-50%", translateY: "-50%" }}
            initial={{ scale: 0.1, opacity: 0 }}
            animate={{
              scale: [0.1, 1.6, 3.4],
              opacity: [0, 1, 0.85],
              transition: { duration: 1.1, times: [0, 0.45, 1], ease: "easeOut" },
            }}
          >
            <div
              className="rounded-full bg-[radial-gradient(circle,rgba(139,124,255,0.85),rgba(94,230,208,0.35)_45%,transparent_70%)] blur-xl"
              style={{ width: Math.max(vw, vh) * 0.55, height: Math.max(vw, vh) * 0.55 }}
            />
          </motion.div>

          <motion.svg
            viewBox="0 0 200 200"
            className="absolute left-1/2 top-1/2"
            style={{
              translateX: "-50%",
              translateY: "-50%",
              width: Math.min(vw, vh) * 0.8,
              height: Math.min(vw, vh) * 0.8,
            }}
            initial={{ scale: 0.2, opacity: 0, rotate: 0 }}
            animate={{
              scale: [0.2, 1, 2.4],
              opacity: [0, 1, 0],
              rotate: 220,
              transition: { duration: 1.2, times: [0, 0.5, 1], ease: "easeOut" },
            }}
          >
            <defs>
              <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8B7CFF" />
                <stop offset="100%" stopColor="#5EE6D0" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="88" fill="none" stroke="url(#tg)" strokeWidth="2.5" />
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke="url(#tg)"
              strokeWidth="2"
              strokeDasharray="16 10"
            />
          </motion.svg>

          {/* Him, big, walking into it. */}
          <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ translateX: "-50%", translateY: "-50%", width: Math.min(vw * 0.7, vh * 0.62) }}
            initial={{ scale: 0.75, opacity: 0, y: 40 }}
            animate={{
              scale: [0.75, 1, 0.55],
              opacity: [0, 1, 0],
              y: [40, 0, -30],
              transition: { duration: 1.25, times: [0, 0.5, 1], ease: "easeInOut" },
            }}
          >
            <div className="relative w-full" style={{ paddingTop: "133%" }}>
              <div className="absolute inset-0">
                <ChromaClip clip="portal_enter" cap={cap} />
              </div>
            </div>
          </motion.div>

          {label && (
            <motion.p
              className="absolute inset-x-0 bottom-[12%] text-center font-display text-2xl text-paper sm:text-3xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: [0, 1, 1], y: 0, transition: { duration: 1, times: [0, 0.4, 1] } }}
            >
              {label}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
