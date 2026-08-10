"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { poses, type Pose } from "./poses";

type AvatarProps = {
  pose: Pose;
  size?: "sm" | "md" | "lg" | "xl";
  trackCursor?: boolean;
  flip?: boolean;
  glow?: boolean;
  className?: string;
};

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-32 sm:w-40",
  md: "w-56 sm:w-64",
  lg: "w-72 sm:w-96",
  xl: "w-80 sm:w-[28rem] lg:w-[32rem]",
};

export default function Avatar({
  pose,
  size = "lg",
  trackCursor = false,
  flip = false,
  glow = true,
  className = "",
}: AvatarProps) {
  const prefersReducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!trackCursor || prefersReducedMotion) return;
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      rotateY.set(Math.max(-8, Math.min(8, dx * 8)));
      rotateX.set(Math.max(-6, Math.min(6, -dy * 6)));
    };
    const onLeave = () => {
      rotateX.set(0);
      rotateY.set(0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [trackCursor, prefersReducedMotion, rotateX, rotateY]);

  return (
    <div
      ref={wrapRef}
      className={`relative select-none ${sizeClasses[size]} ${className}`}
      style={{ perspective: 900 }}
    >
      {glow && (
        <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-accent/20 blur-[70px]" />
      )}

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40, scale: 0.92 }}
        animate={
          ready
            ? {
                opacity: 1,
                y: prefersReducedMotion ? 0 : [0, -10, 0],
                scale: 1,
              }
            : {}
        }
        transition={
          prefersReducedMotion
            ? { duration: 0.4 }
            : {
                opacity: { duration: 0.7 },
                scale: { duration: 0.7 },
                y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={pose}
            src={poses[pose]}
            alt="Abderrahmane's animated avatar"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className={`w-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] ${flip ? "-scale-x-100" : ""}`}
          />
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
