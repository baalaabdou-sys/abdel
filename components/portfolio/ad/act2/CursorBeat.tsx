"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ChromaClip from "../../avatar/ChromaClip";
import type { Capability } from "../../avatar/useCapability";

/**
 * The quiet before Act 2.
 *
 * No music, no effects — the film stops making noise entirely, which is what
 * makes the bass hit at the end of it land. A cursor appears next to him and
 * will not be caught: it slides away from the visitor's pointer (or their
 * finger). After a few attempts he reaches over and takes it himself.
 *
 * This is the only interactive moment inside the film, and it is what hands
 * the act over: the last thing you do is try to grab the interface, and the
 * first thing he does in Act 2 is grab it for you.
 */
export default function CursorBeat({
  cap,
  portrait,
  onDone,
}: {
  cap: Capability;
  portrait: boolean;
  onDone: () => void;
}) {
  const [pos, setPos] = useState({ x: 0.5, y: 0.62 });
  const [caught, setCaught] = useState(false);
  const [tries, setTries] = useState(0);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setCaught(true);
    // He closes his hand, then the act begins.
    setTimeout(onDone, 900);
  }, [onDone]);

  // It runs from you — but only so far, and only for so long.
  const flee = useCallback(
    (px: number, py: number) => {
      if (done.current) return;
      setPos((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.16) return p;
        setTries((t) => t + 1);
        const k = 0.22 / (dist || 0.01);
        return {
          x: Math.min(0.86, Math.max(0.14, p.x + dx * k)),
          y: Math.min(0.8, Math.max(0.2, p.y + dy * k)),
        };
      });
    },
    []
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) =>
      flee(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [flee]);

  // He gets bored of watching you fail. It never stalls here.
  useEffect(() => {
    const t = setTimeout(finish, tries >= 3 ? 600 : 4200);
    return () => clearTimeout(t);
  }, [tries, finish]);

  return (
    <div className="absolute inset-0 z-30 bg-[#04050A]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(139,124,255,0.16),transparent_60%)]" />

      <div className="absolute bottom-0 left-1/2 h-[74%] -translate-x-1/2">
        <ChromaClip
          clip={caught ? "grab_catch" : "permission_smirk"}
          cap={cap}
          className="h-full w-auto"
        />
      </div>

      {/* the cursor */}
      <motion.svg
        className="absolute h-8 w-8 drop-shadow-[0_0_14px_rgba(94,230,208,0.9)]"
        viewBox="0 0 24 24"
        animate={{
          left: `${pos.x * 100}%`,
          top: `${pos.y * 100}%`,
          scale: caught ? 0 : 1,
          rotate: caught ? 90 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        style={{ position: "absolute" }}
      >
        <path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill="#5EE6D0" />
      </motion.svg>

      <motion.p
        className="absolute inset-x-0 bottom-[7%] text-center font-mono text-[11px] tracking-[0.35em] text-paper/40"
        animate={{ opacity: caught ? 0 : [0.2, 0.75, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        {portrait ? "TRY TO TAP IT" : "TRY TO CATCH IT"}
      </motion.p>
    </div>
  );
}
