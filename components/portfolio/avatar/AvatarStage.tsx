"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useAvatarContext } from "./AvatarContext";
import { clips, posterFallback, type ClipKey } from "./clips";

const clipKeys = Object.keys(clips) as ClipKey[];

export default function AvatarStage() {
  const { anchors, actionEmitter } = useAvatarContext();
  const prefersReducedMotion = useReducedMotion();

  const x = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const w = useSpring(useMotionValue(320), { stiffness: 90, damping: 22 });

  const [basePose, setBasePose] = useState<ClipKey>("idle_loop");
  const [baseFlip, setBaseFlip] = useState(false);
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<{ clip: ClipKey; flip?: boolean } | null>(null);

  const basePoseRef = useRef(basePose);
  const baseFlipRef = useRef(baseFlip);
  const visibleRef = useRef(visible);
  basePoseRef.current = basePose;
  baseFlipRef.current = baseFlip;
  visibleRef.current = visible;

  const actionTimer = useRef<ReturnType<typeof setTimeout>>();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    return actionEmitter.on((evt) => {
      setAction({ clip: evt.clip, flip: evt.flip });
      clearTimeout(actionTimer.current);
      actionTimer.current = setTimeout(() => setAction(null), evt.holdMs ?? 2400);
    });
  }, [actionEmitter]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const vh = window.innerHeight;
      let bestEl: HTMLElement | null = null;
      let bestConfig: { basePose: ClipKey; size: number; flip?: boolean } | null = null;
      let bestDist = Infinity;

      anchors.forEach((entry) => {
        const rect = entry.el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - vh / 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestEl = entry.el;
          bestConfig = entry.config;
        }
      });

      if (bestEl && bestConfig) {
        const rect = (bestEl as HTMLElement).getBoundingClientRect();
        const config = bestConfig as { basePose: ClipKey; size: number; flip?: boolean };
        x.set(rect.left + rect.width / 2);
        y.set(rect.top + rect.height / 2);
        w.set(config.size);
        if (basePoseRef.current !== config.basePose) setBasePose(config.basePose);
        if (baseFlipRef.current !== Boolean(config.flip)) setBaseFlip(Boolean(config.flip));
        if (!visibleRef.current) setVisible(true);
      } else if (visibleRef.current) {
        setVisible(false);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchors, x, y, w]);

  const activeClip = action?.clip ?? basePose;
  const activeFlip = action ? Boolean(action.flip) : baseFlip;

  useEffect(() => {
    if (prefersReducedMotion) return;
    clipKeys.forEach((key) => {
      const el = videoRefs.current[key];
      if (!el) return;
      if (key === activeClip) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [activeClip, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-24 z-30 w-40 -translate-x-1/2 opacity-90">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterFallback} alt="Abderrahmane's avatar" className="w-full" />
      </div>
    );
  }

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-30"
      style={{ x, y, width: w, translateX: "-50%", translateY: "-50%", opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-accent/20 blur-[60px]" />
      <div className="relative w-full" style={{ paddingTop: "133%" }}>
        {clipKeys.map((key) => (
          <video
            key={key}
            ref={(el) => {
              videoRefs.current[key] = el;
            }}
            src={clips[key].url}
            muted
            playsInline
            preload="auto"
            loop={clips[key].loop}
            poster={posterFallback}
            onEnded={() => {
              if (key === activeClip && !clips[key].loop && action) setAction(null);
            }}
            className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] transition-opacity duration-300 ${
              key === activeClip ? "opacity-100" : "pointer-events-none opacity-0"
            } ${activeFlip ? "-scale-x-100" : ""}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
