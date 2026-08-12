"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useAvatarContext, type AnchorConfig, type AnchorEntry } from "./AvatarContext";
import { useAvatarOff } from "./avatarPref";
import { clips, posterFallback, type ClipKey } from "./clips";
import { clipFor, STATES, type CharacterState } from "./states";
import { useCapability } from "./useCapability";
import Portal from "./Portal";

const clipKeys = Object.keys(clips) as ClipKey[];

/** How close the pointer must get before he notices it (px). */
const NOTICE_RADIUS = 320;
/** How close before the rare catch can fire (px). */
const CATCH_RADIUS = 90;

/**
 * Gate, deliberately kept as a separate component from the stage itself.
 *
 * Returning null here unmounts everything below: the tracking loop, the
 * chroma-key loop, and all 27 video elements go with it, and their cleanups
 * cancel the animation frames. Checking the preference *inside* the stage
 * would leave those hooks mounted and still running, which is exactly the
 * cost someone reaching for this switch is trying to get rid of.
 */
export default function AvatarStage() {
  const [off] = useAvatarOff();
  if (off) return null;
  return <AvatarStageInner />;
}

function AvatarStageInner() {
  const { anchors, actionEmitter, warmEmitter, pointer, play, activePriority } =
    useAvatarContext();
  const cap = useCapability();

  // Horizontal is deliberately much lazier than vertical. Section anchors sit
  // on alternating sides of the layout, so a responsive x-spring made him
  // zigzag across the viewport as you scrolled. Vertical still tracks scroll
  // closely; lateral moves are a slow glide.
  const x = useSpring(useMotionValue(0), { stiffness: 26, damping: 26 });
  const y = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const w = useSpring(useMotionValue(320), { stiffness: 90, damping: 22 });
  const rotX = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });

  const [ambient, setAmbient] = useState<CharacterState>("idle");
  const [baseFlip, setBaseFlip] = useState(false);
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<{ state: CharacterState; flip?: boolean } | null>(null);
  const [warmed, setWarmed] = useState<ClipKey[]>([]);
  const [caughtCursor, setCaughtCursor] = useState(false);
  const [warp, setWarp] = useState<null | "out" | "in">(null);
  // While the film, the mind or the rebuild is on screen he is completely
  // covered by it, and keying a character nobody can see is the single most
  // expensive thing this page can do on a phone.
  const [covered, setCovered] = useState(false);

  const ambientRef = useRef(ambient);
  const flipRef = useRef(baseFlip);
  const visibleRef = useRef(visible);
  const actionTimer = useRef<ReturnType<typeof setTimeout>>();
  const activeAnchorId = useRef<string | null>(null);
  const centre = useRef({ x: 0, y: 0, w: 320 });
  const lastNotice = useRef(0);
  const lastCatch = useRef(0);
  const warpRef = useRef(false);
  const scrollingUntil = useRef(0);
  const lastWarp = useRef(0);
  const pendingAnchor = useRef<{
    id: string | null;
    cx: number;
    cy: number;
    size: number;
    cfg: AnchorConfig;
  } | null>(null);
  // How long the current candidate anchor has been winning. A switch is only
  // adopted once it has held for a moment, so a boundary between two sections
  // cannot flip the pick back and forth on ordinary scroll jitter.
  const switchStreak = useRef<{ id: string | null; since: number }>({ id: null, since: 0 });
  ambientRef.current = ambient;
  flipRef.current = baseFlip;
  visibleRef.current = visible;

  const activeState: CharacterState = action?.state ?? ambient;
  const activeClip = clipFor(activeState);
  const activeFlip = action ? Boolean(action.flip) : baseFlip;

  useEffect(() => {
    const root = document.documentElement;
    // Only the ad film actually replaces him with its own footage — "Enter
    // my brain" and "Break the portfolio" both put him on screen through
    // their own anchors, so suspending his playback for those killed the
    // very thing they were trying to show (brain_arrange, brain_present,
    // and everything in the rebuild set piece all went dark).
    const read = () => setCovered(root.classList.contains("ad-open"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  /* ── engine: actions override ambient, then fall back ─────────── */
  useEffect(() => {
    return actionEmitter.on((evt) => {
      setAction({ state: evt.state, flip: evt.flip });
      clearTimeout(actionTimer.current);
      actionTimer.current = setTimeout(() => {
        if (evt.then) play(evt.then);
        else setAction(null);
      }, evt.holdMs ?? STATES[evt.state].hold);
    });
  }, [actionEmitter, play]);

  useEffect(() => {
    return warmEmitter.on((clip) => {
      setWarmed((p) => (p.includes(clip) ? p : [...p, clip]));
    });
  }, [warmEmitter]);

  /* Warping mid-scroll relocates him while the visitor is still moving,
     which reads as the character jumping around. Only travel once the page
     has actually settled. */
  useEffect(() => {
    const onScroll = () => {
      scrollingUntil.current = Date.now() + 260;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── the journey: portal out here, portal in there ────────────── */
  useEffect(() => {
    if (warp !== "out") return;
    // Let the ring bloom and swallow him, then cut him to the next section
    // instantly (no travel) and open a second portal there.
    const t = setTimeout(() => {
      const next = pendingAnchor.current;
      if (next) {
        activeAnchorId.current = next.id;
        centre.current = { x: next.cx, y: next.cy, w: next.size };
        // jump() moves the spring without animating, so he genuinely
        // reappears rather than sliding between the two portals.
        x.jump(next.cx);
        y.jump(next.cy);
        w.jump(next.size);
        setAmbient(next.cfg.basePose);
        setBaseFlip(Boolean(next.cfg.flip));
      }
      setWarp("in");
      play("portal_exit");
    }, 620);
    return () => clearTimeout(t);
  }, [warp, play, x, y, w]);

  useEffect(() => {
    if (warp !== "in") return;
    const t = setTimeout(() => {
      setWarp(null);
      warpRef.current = false;
      pendingAnchor.current = null;
    }, 900);
    return () => clearTimeout(t);
  }, [warp]);

  /* ── anchor tracking ──────────────────────────────────────────── */
  useEffect(() => {
    const SWITCH_MARGIN = 80;
    const interval = cap.isTouch ? 50 : 0;
    let last = 0;

    /**
     * Is this anchor actually laid out?
     *
     * An anchor inside a section that is hidden at the current breakpoint —
     * Projects' is `hidden sm:block` — stays registered and returns a zero
     * rect at the origin. That rect passes the on-screen test below (its
     * bottom is not above the viewport and its top is not below it), sits a
     * constant vh/2 from centre so it never loses on distance no matter how
     * far you scroll, and reports a centre of x=0.
     *
     * The result on every phone was a phantom anchor permanently competing
     * with the real ones and throwing him at the left edge and back. A box
     * with no area is not somewhere he can stand.
     */
    const laidOut = (r: DOMRect) => r.width > 0 || r.height > 0;
    const onScreen = (r: DOMRect, vh: number) =>
      laidOut(r) && r.bottom >= 0 && r.top <= vh;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < interval) return;
      last = now;

      const vh = window.innerHeight;
      let bestId: string | null = null;
      let bestEl: HTMLElement | null = null;
      let bestCfg: AnchorConfig | null = null;
      let bestDist = Infinity;

      // An exclusive anchor takes him outright — a full-screen experience is
      // running and the sections behind it are still mounted.
      let exclusive: [string, AnchorEntry] | null = null;
      anchors.forEach((entry, id) => {
        if (entry.config.exclusive) exclusive = [id, entry];
      });

      if (exclusive) {
        const [id, entry] = exclusive as [string, AnchorEntry];
        bestId = id;
        bestEl = entry.el;
        bestCfg = entry.config;
        bestDist = 0;
      } else {
        anchors.forEach((entry, id) => {
          const r = entry.el.getBoundingClientRect();
          if (!onScreen(r, vh)) return;
          const dist = Math.abs(r.top + r.height / 2 - vh / 2);
          if (dist < bestDist) {
            bestDist = dist;
            bestEl = entry.el;
            bestCfg = entry.config;
            bestId = id;
          }
        });
      }

      // Hysteresis so two near-equidistant anchors can't ping-pong.
      const curId = activeAnchorId.current;
      if (!exclusive && curId && curId !== bestId) {
        const cur = anchors.get(curId);
        if (cur) {
          const r = cur.el.getBoundingClientRect();
          if (onScreen(r, vh)) {
            const d = Math.abs(r.top + r.height / 2 - vh / 2);
            if (d <= bestDist + SWITCH_MARGIN) {
              bestId = curId;
              bestEl = cur.el;
              bestCfg = cur.config;
            }
          }
        }
      }

      // A candidate has to keep winning for a moment before it is adopted,
      // so a boundary between two sections cannot flip the pick back and
      // forth on ordinary scroll jitter. Held in milliseconds rather than a
      // frame count because this loop runs every frame on a desktop and
      // every 50ms on a phone — a count would mean two different delays.
      if (!exclusive && bestId !== curId) {
        if (switchStreak.current.id !== bestId) {
          switchStreak.current = { id: bestId, since: now };
        }
        if (now - switchStreak.current.since < 120) {
          const cur = curId ? anchors.get(curId) : null;
          if (cur && onScreen(cur.el.getBoundingClientRect(), vh)) {
            bestId = curId;
            bestEl = cur.el;
            bestCfg = cur.config;
          }
        }
      } else {
        switchStreak.current = { id: null, since: now };
      }

      if (bestEl && bestCfg) {
        const r = (bestEl as HTMLElement).getBoundingClientRect();
        const cfg = bestCfg as AnchorConfig;
        const vw = window.innerWidth;
        const scale = vw < 480 ? 0.82 : vw < 768 ? 0.9 : vw < 1024 ? 0.95 : 1;
        // Below the tablet breakpoint every section is a single centred
        // column, so an anchor's horizontal offset is a desktop affordance
        // with nothing to sit beside. Honouring it anyway meant the build
        // section pulled him 100px left of where every other section put him
        // — a quarter of a 375px screen — and the deliberately lazy x-spring
        // spent the whole scroll easing him across that gap and back, which
        // is the sideways drift. On a phone he simply holds the centre line.
        const cx = vw < 768 ? vw / 2 : r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const size = cfg.size * scale;

        // Moving to a different section is a journey, not a slide: he opens a
        // portal, steps through, and comes out of another one where he's
        // needed next. While that plays we freeze position tracking so the
        // spring can't drag him across the screen underneath the effect.
        const changed = bestId !== activeAnchorId.current;
        const far = Math.hypot(cx - centre.current.x, cy - centre.current.y) > 260;
        if (
          changed &&
          activeAnchorId.current !== null &&
          far &&
          !warpRef.current &&
          !cap.reducedMotion &&
          Date.now() > scrollingUntil.current &&
          Date.now() - lastWarp.current > 2600 &&
          // Never teleport out from under something the visitor asked for.
          activePriority() < 90 &&
          // The rebuild set piece runs its own choreography; a portal jump
          // in the middle of it would fight the timeline.
          !document.documentElement.classList.contains("rb-running")
        ) {
          warpRef.current = true;
          lastWarp.current = Date.now();
          pendingAnchor.current = { id: bestId, cx, cy, size, cfg };
          setWarp("out");
          play("portal_enter");
          return;
        }

        if (warpRef.current) return;

        activeAnchorId.current = bestId;
        centre.current = { x: cx, y: cy, w: size };
        x.set(cx);
        y.set(cy);
        w.set(size);
        if (ambientRef.current !== cfg.basePose) setAmbient(cfg.basePose);
        if (flipRef.current !== Boolean(cfg.flip)) setBaseFlip(Boolean(cfg.flip));
        if (!visibleRef.current) setVisible(true);
      } else if (!warpRef.current) {
        activeAnchorId.current = null;
        if (visibleRef.current) setVisible(false);
      }
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchors, x, y, w, cap.isTouch, cap.reducedMotion, play, activePriority]);

  /* ── fourth wall: he watches the pointer / the last touch ─────── */
  useEffect(() => {
    if (cap.reducedMotion) return;

    const handle = (px: number, py: number, isTouch: boolean, tilt: boolean) => {
      pointer.x = px;
      pointer.y = py;
      pointer.active = true;
      pointer.isTouch = isTouch;

      const { x: cx, y: cy, w: cw } = centre.current;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);

      // Lean toward them — mouse only. A finger's position changes constantly
      // while scrolling, and tilting a character this large off every one of
      // those events made him visibly rock left and right down the page.
      if (tilt) {
        rotY.set(Math.max(-6, Math.min(6, (dx / (window.innerWidth / 2)) * 6)));
        rotX.set(Math.max(-4, Math.min(4, (-dy / (window.innerHeight / 2)) * 4)));
      }

      const now = Date.now();
      // He reaches out and grabs the cursor.
      if (
        !isTouch &&
        dist < Math.min(CATCH_RADIUS, cw * 0.35) &&
        now - lastCatch.current > 11000
      ) {
        lastCatch.current = now;
        lastNotice.current = now;
        setCaughtCursor(true);
        play("grabbing", { flip: dx < 0 });
        setTimeout(() => setCaughtCursor(false), 2600);
        return;
      }
      // He glances over when they come close.
      if (dist < NOTICE_RADIUS && now - lastNotice.current > 8000) {
        lastNotice.current = now;
        play("noticing", { flip: dx < 0 });
      }
    };

    const onMove = (e: PointerEvent) => {
      // Ignore synthetic pointermove from touch scrolling.
      if (e.pointerType !== "mouse") return;
      handle(e.clientX, e.clientY, false, true);
    };
    // On touch, only a deliberate tap counts — never a scroll gesture.
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0] ?? e.changedTouches[0];
      if (t) handle(t.clientX, t.clientY, true, false);
    };
    const onLeave = () => {
      pointer.active = false;
      rotX.set(0);
      rotY.set(0);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [cap.reducedMotion, play, pointer, rotX, rotY]);

  /* ── playback: only the active clip runs ──────────────────────── */
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRaf = useRef<number>();

  useEffect(() => {
    if (cap.reducedMotion) return;
    // Nothing decodes while he is behind a full-screen experience.
    if (covered) {
      clipKeys.forEach((key) => videoRefs.current[key]?.pause());
      return;
    }
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
      if (el.readyState >= 3) start();
      else {
        el.addEventListener("canplaythrough", start, { once: true });
        const t = setTimeout(start, 1200);
        cleanups.push(() => {
          el.removeEventListener("canplaythrough", start);
          clearTimeout(t);
        });
      }
    });
    return () => cleanups.forEach((f) => f());
  }, [activeClip, cap.reducedMotion, covered]);

  useEffect(() => {
    // Covered by a full-screen experience: no keying, no decoding.
    if (covered) return;

    if (cap.reducedMotion) return;
    const canvas = canvasRef.current;
    const video = videoRefs.current[activeClip];
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
      keyRaf.current = requestAnimationFrame(draw);
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
          if (dist < TOL) d[i + 3] = 0;
          else if (dist < TOL + SOFT) {
            d[i + 3] = Math.round((255 * (dist - TOL)) / SOFT);
            if (g > r + SPILL && g > b + SPILL) d[i + 1] = Math.round((r + b) / 2);
          } else if (g > r + SPILL && g > b + SPILL) {
            d[i + 1] = Math.round((r + b) / 2);
          }
        }
        ctx.putImageData(frame, 0, 0);
      } catch {
        broken = true;
      }
    };
    keyRaf.current = requestAnimationFrame(draw);
    return () => {
      if (keyRaf.current) cancelAnimationFrame(keyRaf.current);
    };
  }, [activeClip, cap.reducedMotion, cap.keyWidth, cap.keyInterval, covered]);

  if (cap.reducedMotion) {
    return (
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[70]"
        style={{ x, y, width: w, translateX: "-50%", translateY: "-50%", opacity: visible ? 1 : 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterFallback} alt="Abderrahmane's avatar" className="w-full" />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        // Surfaces what the engine is actually doing, so the character's
        // state is observable in devtools and assertable in tests.
        data-character-state={activeState}
        // Observable so the expensive path can be checked on a real device,
        // not just asserted here.
        data-character-keying={covered ? "suspended" : "live"}
        className="pointer-events-none fixed left-0 top-0 z-[70]"
        style={{
          x,
          y,
          width: w,
          translateX: "-50%",
          translateY: "-50%",
          opacity: visible ? 1 : 0,
          perspective: 900,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-accent/20 blur-[60px]" />

        {/* His signature ring, opening at both ends of the journey. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          <Portal open={warp !== null} size={340} />
        </div>

        <motion.div
          className="relative w-full"
          style={{ paddingTop: "133%", rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
          animate={
            warp === "out"
              ? { scale: 0.15, opacity: 0, filter: "blur(12px)" }
              : warp === "in"
                ? { scale: [0.25, 1], opacity: [0, 1], filter: ["blur(10px)", "blur(0px)"] }
                : { scale: 1, opacity: 1, filter: "blur(0px)" }
          }
          transition={{ duration: warp === "out" ? 0.55 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {clipKeys.map((key) => (
            <video
              key={key}
              ref={(el) => {
                videoRefs.current[key] = el;
              }}
              src={clips[key].url || undefined}
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
        </motion.div>
      </motion.div>

      {/* The illusion of him holding the pointer. The real cursor is never
          captured — this just rides along beside it for a couple of seconds. */}
      {caughtCursor && !cap.isTouch && (
        <motion.div
          className="pointer-events-none fixed z-[60]"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{ left: centre.current.x, top: centre.current.y - centre.current.w * 0.15 }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg">
            <path d="M4 2l7 18 2.5-7.5L21 10z" fill="#5EE6D0" stroke="#0B0E1A" strokeWidth="1.5" />
          </svg>
        </motion.div>
      )}
    </>
  );
}
