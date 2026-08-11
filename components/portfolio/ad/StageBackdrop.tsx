"use client";

import { useEffect, useRef } from "react";

/**
 * What fills a phone screen around the film.
 *
 * A 16:9 stage on a portrait phone leaves most of the screen empty, and a
 * small picture floating in a black void reads as broken rather than
 * cinematic. This spills the current frame out behind it — heavily blurred
 * and dimmed — so the whole screen carries the shot's light and colour while
 * the stage keeps the actual composition.
 *
 * It costs almost nothing: the frame is sampled into a 48x27 canvas a few
 * times a second and stretched by CSS. No second video decode, which is what
 * a duplicated <video> would have cost on a mid-range phone.
 */
export default function StageBackdrop({
  getVideo,
  active,
}: {
  getVideo: () => HTMLVideoElement | null;
  active: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const c = canvas.current;
    const ctx = c?.getContext("2d", { alpha: false });
    if (!c || !ctx) return;
    let raf = 0;
    let last = 0;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // A handful of frames a second is plenty at this blur.
      if (t - last < 120) return;
      last = t;
      const v = getVideo();
      if (!v || v.readyState < 2 || v.videoWidth === 0) return;
      try {
        ctx.drawImage(v, 0, 0, c.width, c.height);
      } catch {
        /* frame not decodable yet */
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, getVideo]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas
        ref={canvas}
        width={48}
        height={27}
        aria-hidden
        className="h-full w-full object-cover"
        style={{ filter: "blur(34px) saturate(1.5) brightness(0.42)", transform: "scale(1.25)" }}
      />
      {/* keeps the stage edges readable against it */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_30%,rgba(0,0,0,0.72)_100%)]" />
    </div>
  );
}
