"use client";

import { useEffect, useRef } from "react";
import { clips, posterFallback, type ClipKey } from "./clips";
import type { Capability } from "./useCapability";

/**
 * Renders one green-screen clip with the green punched out live, so the
 * character sits directly on the page. Shared by the main character and by
 * the clone instances.
 */
export default function ChromaClip({
  clip,
  cap,
  flip = false,
  className = "",
  onEnded,
}: {
  clip: ClipKey;
  cap: Capability;
  flip?: boolean;
  className?: string;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    const start = () => video.play().catch(() => {});
    if (video.readyState >= 3) start();
    else {
      video.addEventListener("canplaythrough", start, { once: true });
      const t = setTimeout(start, 1200);
      return () => {
        video.removeEventListener("canplaythrough", start);
        clearTimeout(t);
      };
    }
  }, [clip]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let keyColor: [number, number, number] | null = null;
    let broken = false;
    let last = 0;
    const TOL = 70;
    const SOFT = 45;
    const SPILL = 18;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - last < cap.keyInterval) return;
      last = now;
      if (video.readyState < 2 || video.paused || video.ended) return;

      const vw = video.videoWidth || 480;
      const vh = video.videoHeight || 640;
      const outW = cap.keyWidth;
      const outH = Math.round((outW * vh) / vw) || Math.round(outW * 1.33);
      if (canvas.width !== outW || canvas.height !== outH) {
        canvas.width = outW;
        canvas.height = outH;
        keyColor = null;
      }

      ctx.drawImage(video, 0, 0, outW, outH);
      if (broken) return;

      try {
        const frame = ctx.getImageData(0, 0, outW, outH);
        const d = frame.data;
        if (!keyColor) {
          const i = (2 * outW + 2) * 4;
          keyColor = [d[i], d[i + 1], d[i + 2]];
        }
        const [kr, kg, kb] = keyColor;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
          if (dist < TOL) {
            d[i + 3] = 0;
          } else if (dist < TOL + SOFT) {
            d[i + 3] = Math.round((255 * (dist - TOL)) / SOFT);
            if (g > r + SPILL && g > b + SPILL) d[i + 1] = Math.round((r + b) / 2);
          } else if (g > r + SPILL && g > b + SPILL) {
            d[i + 1] = Math.round((r + b) / 2);
          }
        }
        ctx.putImageData(frame, 0, 0);
      } catch {
        // Cross-origin frame the canvas may not read — show it un-keyed
        // rather than killing the animation loop.
        broken = true;
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [clip, cap.keyWidth, cap.keyInterval]);

  const src = clips[clip]?.url;
  if (!src) return null;

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        muted
        playsInline
        preload="auto"
        loop={clips[clip].loop}
        poster={posterFallback}
        onEnded={onEnded}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <canvas
        ref={canvasRef}
        className={`h-full w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] ${
          flip ? "-scale-x-100" : ""
        } ${className}`}
      />
    </>
  );
}
