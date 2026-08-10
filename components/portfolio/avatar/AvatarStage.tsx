"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useAvatarContext } from "./AvatarContext";
import { clips, posterFallback, type ClipKey } from "./clips";

const clipKeys = Object.keys(clips) as ClipKey[];

export default function AvatarStage() {
  const { anchors, actionEmitter, warmEmitter } = useAvatarContext();
  const prefersReducedMotion = useReducedMotion();
  const [isTouch, setIsTouch] = useState(false);
  const [warmed, setWarmed] = useState<ClipKey[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Only an explicit OS-level reduced-motion preference gets the static
  // fallback — phones get the full video + chroma-key experience too, just
  // throttled (see below) since they have far less CPU headroom than desktop.
  const lightweight = prefersReducedMotion;

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
  const activeAnchorIdRef = useRef<string | null>(null);

  useEffect(() => {
    return actionEmitter.on((evt) => {
      setAction({ clip: evt.clip, flip: evt.flip });
      clearTimeout(actionTimer.current);
      actionTimer.current = setTimeout(() => setAction(null), evt.holdMs ?? 2400);
    });
  }, [actionEmitter]);

  useEffect(() => {
    return warmEmitter.on((clip) => {
      setWarmed((prev) => (prev.includes(clip) ? prev : [...prev, clip]));
      videoRefs.current[clip]?.load();
    });
  }, [warmEmitter]);

  useEffect(() => {
    // How much closer a different anchor must be, in px, before we switch
    // to it. Without this, two anchors that are nearly tied in distance
    // (common on short mobile viewports, or mid-scroll on any device) cause
    // the "closest" pick to flip every frame, snapping the character's
    // target position back and forth — this margin adds hysteresis so it
    // only switches on a real, decisive change.
    const SWITCH_MARGIN = 80;
    // getBoundingClientRect forces layout; on touch devices we poll it far
    // less often (desktop: every frame, phones: ~20fps) since the character
    // only needs to catch up with scroll, not track it at 60fps.
    const MIN_INTERVAL_MS = isTouch ? 50 : 0;
    let lastTick = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastTick < MIN_INTERVAL_MS) return;
      lastTick = now;

      const vh = window.innerHeight;
      let bestId: string | null = null;
      let bestEl: HTMLElement | null = null;
      let bestConfig: { basePose: ClipKey; size: number; flip?: boolean } | null = null;
      let bestDist = Infinity;

      anchors.forEach((entry, id) => {
        const rect = entry.el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - vh / 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestEl = entry.el;
          bestConfig = entry.config;
          bestId = id;
        }
      });

      let chosenId: string | null = bestId;
      let chosenEl: HTMLElement | null = bestEl;
      let chosenConfig: { basePose: ClipKey; size: number; flip?: boolean } | null = bestConfig;
      let chosenDist: number = bestDist;

      const currentId = activeAnchorIdRef.current;
      if (currentId && currentId !== bestId) {
        const current = anchors.get(currentId);
        if (current) {
          const rect = current.el.getBoundingClientRect();
          if (rect.bottom >= 0 && rect.top <= vh) {
            const center = rect.top + rect.height / 2;
            const curDist = Math.abs(center - vh / 2);
            if (curDist <= bestDist + SWITCH_MARGIN) {
              chosenId = currentId;
              chosenEl = current.el;
              chosenConfig = current.config;
              chosenDist = curDist;
            }
          }
        }
      }
      void chosenDist;

      if (chosenEl && chosenConfig) {
        activeAnchorIdRef.current = chosenId;
        const rect = (chosenEl as HTMLElement).getBoundingClientRect();
        const config = chosenConfig as { basePose: ClipKey; size: number; flip?: boolean };
        // The pixel sizes in each section's anchor config are tuned for
        // desktop-width anchor boxes. On a phone the anchor box itself is
        // much smaller (responsive Tailwind classes), so without scaling,
        // the avatar renders far larger than the space reserved for it and
        // visibly overlaps/misaligns with the content around it.
        const vw = window.innerWidth;
        const sizeScale = vw < 480 ? 0.82 : vw < 768 ? 0.9 : vw < 1024 ? 0.95 : 1;
        x.set(rect.left + rect.width / 2);
        y.set(rect.top + rect.height / 2);
        w.set(config.size * sizeScale);
        if (basePoseRef.current !== config.basePose) setBasePose(config.basePose);
        if (baseFlipRef.current !== Boolean(config.flip)) setBaseFlip(Boolean(config.flip));
        if (!visibleRef.current) setVisible(true);
      } else {
        activeAnchorIdRef.current = null;
        if (visibleRef.current) setVisible(false);
      }
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchors, x, y, w, isTouch]);

  const activeClip = action?.clip ?? basePose;
  const activeFlip = action ? Boolean(action.flip) : baseFlip;

  useEffect(() => {
    if (lightweight) return;
    const cleanups: (() => void)[] = [];

    clipKeys.forEach((key) => {
      const el = videoRefs.current[key];
      if (!el) return;
      if (key !== activeClip) {
        el.pause();
        return;
      }

      el.currentTime = 0;
      const start = () => el.play().catch(() => {});

      // Starting playback before enough of the clip is buffered causes
      // stalls that read as jittery/back-and-forth motion, especially on
      // mobile networks — wait for canplaythrough when it isn't ready yet.
      if (el.readyState >= 3) {
        start();
      } else {
        el.addEventListener("canplaythrough", start, { once: true });
        const fallback = setTimeout(start, 1200);
        cleanups.push(() => {
          el.removeEventListener("canplaythrough", start);
          clearTimeout(fallback);
        });
      }
    });

    return () => cleanups.forEach((fn) => fn());
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
    // Reading/writing every pixel of every frame is the single heaviest
    // thing this component does. Phones get a smaller working resolution
    // and a capped processing rate so it doesn't compete with everything
    // else on a weaker CPU.
    const TARGET_W = isTouch ? 420 : 480;
    const MIN_FRAME_MS = isTouch ? 42 : 0; // ~24fps on touch, uncapped on desktop
    let lastDraw = 0;

    const draw = (now: number) => {
      keyRafRef.current = requestAnimationFrame(draw);
      if (now - lastDraw < MIN_FRAME_MS) return;
      lastDraw = now;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        const vw = video.videoWidth || 480;
        const vh = video.videoHeight || 640;
        const outW = TARGET_W;
        const outH = Math.round((outW * vh) / vw) || Math.round(outW * 1.33);
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
    };

    keyRafRef.current = requestAnimationFrame(draw);
    return () => {
      if (keyRafRef.current) cancelAnimationFrame(keyRafRef.current);
    };
  }, [activeClip, lightweight, isTouch]);

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
            preload={clips[key].eager || warmed.includes(key) ? "auto" : "metadata"}
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
