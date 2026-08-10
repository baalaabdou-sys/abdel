"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useAvatarContext } from "./AvatarContext";
import { clips, posterFallback, type ClipKey } from "./clips";

const clipKeys = Object.keys(clips) as ClipKey[];

export default function AvatarStage() {
  const { anchors, actionEmitter } = useAvatarContext();
  const prefersReducedMotion = useReducedMotion();
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsSmallScreen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Phones skip video decode + per-frame canvas chroma-keying (battery/CPU
  // heavy) and fall back to a single static image that still tracks scroll.
  const lightweight = prefersReducedMotion || isSmallScreen;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRafRef = useRef<number>();

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
        const scale = window.innerWidth < 640 ? 0.55 : window.innerWidth < 1024 ? 0.8 : 1;
        x.set(rect.left + rect.width / 2);
        y.set(rect.top + rect.height / 2);
        w.set(config.size * scale);
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
    if (lightweight) return;
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
  }, [activeClip, lightweight]);

  // Live chroma-key compositing: the source clips are shot on solid green,
  // and here we punch that out per-frame onto a canvas so the character
  // sits directly on the page background instead of a colored box.
  useEffect(() => {
    if (lightweight) return;
    const canvas = canvasRef.current;
    const video = videoRefs.current[activeClip];
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let keyColor: [number, number, number] | null = null;
    let keyingBroken = false;
    const TOLERANCE = 70;
    const SOFT = 45;
    const SPILL = 18;

    const draw = () => {
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        const vw = video.videoWidth || 480;
        const vh = video.videoHeight || 640;
        const outW = 480;
        const outH = Math.round((outW * vh) / vw) || 640;
        if (canvas.width !== outW || canvas.height !== outH) {
          canvas.width = outW;
          canvas.height = outH;
          keyColor = null;
        }

        ctx.drawImage(video, 0, 0, outW, outH);

        if (!keyingBroken) {
          try {
            const frame = ctx.getImageData(0, 0, outW, outH);
            const data = frame.data;

            if (!keyColor) {
              const idx = (2 * outW + 2) * 4;
              keyColor = [data[idx], data[idx + 1], data[idx + 2]];
            }

            const [kr, kg, kb] = keyColor;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const dr = r - kr;
              const dg = g - kg;
              const db = b - kb;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist < TOLERANCE) {
                data[i + 3] = 0;
              } else if (dist < TOLERANCE + SOFT) {
                data[i + 3] = Math.round((255 * (dist - TOLERANCE)) / SOFT);
                if (g > r + SPILL && g > b + SPILL) {
                  data[i + 1] = Math.round((r + b) / 2);
                }
              } else if (g > r + SPILL && g > b + SPILL) {
                data[i + 1] = Math.round((r + b) / 2);
              }
            }

            ctx.putImageData(frame, 0, 0);
          } catch (err) {
            // Cross-origin frame without permissive CORS headers taints the
            // canvas — fall back to showing the raw (un-keyed) frame instead
            // of crashing the animation loop.
            keyingBroken = true;
            console.warn("Avatar chroma-key disabled (canvas read blocked):", err);
          }
        }
      }
      keyRafRef.current = requestAnimationFrame(draw);
    };

    keyRafRef.current = requestAnimationFrame(draw);
    return () => {
      if (keyRafRef.current) cancelAnimationFrame(keyRafRef.current);
    };
  }, [activeClip, lightweight]);

  if (lightweight) {
    return (
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-30"
        style={{ x, y, width: w, translateX: "-50%", translateY: "-50%", opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterFallback} alt="Abderrahmane's avatar" className="w-full" />
      </motion.div>
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
            crossOrigin="anonymous"
            muted
            playsInline
            preload="auto"
            loop={clips[key].loop}
            onEnded={() => {
              if (key === activeClip && !clips[key].loop && action) setAction(null);
            }}
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
        ))}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] ${
            activeFlip ? "-scale-x-100" : ""
          }`}
        />
      </div>
    </motion.div>
  );
}
