"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChromaClip from "./ChromaClip";
import type { ClipKey } from "./clips";
import { useCapability } from "./useCapability";

type Clone = { id: number; clip: ClipKey; x: string; y: string; size: number; flip?: boolean };

const ROSTER: Clone[] = [
  { id: 1, clip: "throw", x: "12%", y: "62%", size: 150 },
  { id: 2, clip: "grab_catch", x: "86%", y: "58%", size: 150, flip: true },
  { id: 3, clip: "skills_tap", x: "30%", y: "18%", size: 120 },
  { id: 4, clip: "idle_loop", x: "72%", y: "16%", size: 120, flip: true },
  { id: 5, clip: "sit_lean", x: "50%", y: "84%", size: 130 },
];

/**
 * The "wait — there's more than one of him?" beat. Same character, several
 * instances, each doing a different job, then they all collapse back into the
 * one real character. Count is capped by device tier.
 */
export default function AvatarClones({ active }: { active: boolean }) {
  const cap = useCapability();
  const [shown, setShown] = useState<Clone[]>([]);

  useEffect(() => {
    if (!active || cap.reducedMotion) {
      setShown([]);
      return;
    }
    const roster = ROSTER.slice(0, cap.maxClones);
    // Stagger them in so they appear to arrive one by one.
    const timers = roster.map((c, i) =>
      setTimeout(() => setShown((p) => (p.some((x) => x.id === c.id) ? p : [...p, c])), i * 420)
    );
    return () => timers.forEach(clearTimeout);
  }, [active, cap.reducedMotion, cap.maxClones]);

  if (cap.reducedMotion) return null;

  return (
    <AnimatePresence>
      {shown.map((c) => (
        <motion.div
          key={c.id}
          className="pointer-events-none absolute"
          style={{ left: c.x, top: c.y, width: c.size, translateX: "-50%", translateY: "-50%" }}
          initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
          animate={{ opacity: 0.92, scale: 1, filter: "blur(0px)" }}
          exit={{
            // They don't fade — they rush back toward the real character.
            opacity: 0,
            scale: 0.3,
            left: "50%",
            top: "50%",
            filter: "blur(8px)",
            transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] },
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative w-full" style={{ paddingTop: "133%" }}>
            <div className="absolute inset-0">
              <ChromaClip clip={c.clip} cap={cap} flip={c.flip} />
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
