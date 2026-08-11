"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChromaClip from "../avatar/ChromaClip";
import { clips } from "../avatar/clips";
import { useCapability } from "../avatar/useCapability";
import { INTRO, INTRO_DURATION_S, SEEN_KEY } from "./introClip";

/**
 * The way in.
 *
 * The portfolio is mounted underneath from the first paint — this is a layer
 * over it, not a route in front of it. Nothing is swapped, so there is no
 * moment where the site is not there.
 *
 * The transition is the point. The portal does not end the video and hand over
 * to a page: it is punched through this layer as a growing hole, so what you
 * see inside the portal *is* the portfolio, already there, already moving. The
 * video only unmounts once the hole is bigger than the screen, which means
 * there is never a frame of black between the two.
 */

type Phase = "idle" | "armed" | "playing" | "opening" | "done";

export default function Intro() {
  const cap = useCapability();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Two separate loops run here — one watching the clip for its last beat,
  // one driving the portal — and they must not share a handle. They did, and
  // the watcher's cleanup cancelled the portal on the frame it started.
  const watchRaf = useRef(0);
  const openRaf = useRef(0);
  const openedAt = useRef(0);
  const portalStart = useRef<number | null>(null);

  /* ── who sees this ────────────────────────────────────────
     Once per session, and never for someone who has asked for less
     motion — for them the site is simply already open. */
  useEffect(() => {
    const seen = sessionStorage.getItem(SEEN_KEY) === "1";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || still) {
      setPhase("done");
      return;
    }
    document.documentElement.classList.add("intro-open");
    setPhase("playing");
  }, []);


  const finish = useCallback(() => {
    sessionStorage.setItem(SEEN_KEY, "1");
    const root = document.documentElement;
    root.classList.remove("intro-open", "intro-arriving");
    root.style.removeProperty("--intro-scale");
    root.style.removeProperty("--intro-blur");
    // Let go of the video rather than leaving it decoded in the background.
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    cancelAnimationFrame(watchRaf.current);
    cancelAnimationFrame(openRaf.current);
    setPhase("done");
  }, []);

  /** Begin the portal. Driven on its own clock so it survives the clip ending. */
  const openPortal = useCallback(() => {
    if (openedAt.current) return;
    openedAt.current = performance.now();
    setPhase("opening");
    document.documentElement.classList.add("intro-arriving");

    const step = () => {
      openRaf.current = requestAnimationFrame(step);
      const p = Math.min(1, (performance.now() - openedAt.current) / INTRO.transitionMs);
      setProgress(p);
      // The site behind is flying toward us as the portal opens.
      const root = document.documentElement;
      root.style.setProperty("--intro-scale", String(1 + 0.07 * (1 - p)));
      root.style.setProperty("--intro-blur", `${8 * (1 - p) * (1 - p)}px`);
      if (p >= 1) finish();
    };
    openRaf.current = requestAnimationFrame(step);
  }, [finish]);

/* ── nobody gets stuck here ────────────────────────────────
     Held at the top level rather than inside a phase, because the phases
     are exactly what a failure knocks off course. Whatever happens — no
     codec, a stalled fetch, an unplayable file, a paused tab — the portal
     opens and the site is handed over. */
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const bail = setTimeout(
      () => openPortal(),
      (INTRO.portalStartAt ?? INTRO_DURATION_S) * 1000 + 3000
    );
    return () => clearTimeout(bail);
  }, [phase, openPortal]);

  /* ── watch the clip for its own last beat ──────────────── */
  useEffect(() => {
    if (phase !== "playing") return;
    const v = videoRef.current;
    if (!v) return;

    const arm = () => {
      // The real duration, read from the file. Never assumed.
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      portalStart.current =
        INTRO.portalStartAt ?? Math.max(0, d - INTRO.portalStartFromEnd);
    };
    if (v.readyState >= 1) arm();
    v.addEventListener("loadedmetadata", arm);

    const watch = () => {
      watchRaf.current = requestAnimationFrame(watch);
      const start = portalStart.current;
      if (start === null) return;
      if (v.currentTime >= start) openPortal();
    };
    watchRaf.current = requestAnimationFrame(watch);

    // Belt and braces. Any of these means the shot is over or was never
    // going to play — an old browser without the codec, a failed fetch, a
    // stalled decode — and none of them may leave someone on a black screen.
    v.addEventListener("ended", openPortal);
    v.addEventListener("error", openPortal);
    const failsafe = setTimeout(
      openPortal,
      (INTRO.portalStartAt ?? INTRO_DURATION_S) * 1000 + 2500
    );
    return () => {
      clearTimeout(failsafe);
      v.removeEventListener("loadedmetadata", arm);
      v.removeEventListener("ended", openPortal);
      v.removeEventListener("error", openPortal);
      cancelAnimationFrame(watchRaf.current);
    };
  }, [phase, openPortal]);

  /* ── autoplay, and the polite fallback when it is refused ── */
  useEffect(() => {
    if (phase !== "playing" || INTRO.mode !== "scene") return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play()
      .then(() => setReady(true))
      .catch((err: DOMException) => {
        if (err?.name === "NotAllowedError") {
          // Sound was refused. Offer the gesture rather than starting silently
          // and pretending this is what was intended.
          setPhase("armed");
          return;
        }
        // Anything else — no codec, bad fetch, a decode that will never
        // start — means this shot is not going to play at all. Do not offer a
        // button that cannot work: go straight through the portal.
        openPortal();
      });
  }, [phase, openPortal]);

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play()
      .then(() => {
        setPhase("playing");
        setReady(true);
      })
      .catch(() => {
        v.muted = true;
        // Second refusal means it is not the sound that is the problem.
        v.play()
          .then(() => {
            setPhase("playing");
            setReady(true);
          })
          .catch(openPortal);
      });
  };

  if (phase === "done") return null;

  const opening = phase === "opening";
  // Eased so the portal creeps, then swallows.
  const e = opening ? progress * progress * (3 - 2 * progress) : 0;
  const radius = e * 145;
  const feather = Math.max(2, 18 * (1 - e));
  const { x, y } = INTRO.focal;
  const hole = `radial-gradient(circle at ${x * 100}% ${y * 100}%, transparent ${radius}%, black ${
    radius + feather
  }%)`;

  return (
    <motion.div
      className="fixed inset-0 z-[95] bg-black"
      style={{ height: "100dvh" }}
      aria-label="Intro"
      // The layer itself is erased from the middle outwards, so the portal is
      // literally a hole through to the site rather than a picture of one.
      animate={{ WebkitMaskImage: hole, maskImage: hole } as never}
      transition={{ duration: 0 }}
    >
      {/* ── the shot ─────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: 1 + e * 0.45, filter: `blur(${e * 7}px)` }}
        transition={{ duration: 0 }}
      >
        {INTRO.mode === "scene" ? (
          <video
            ref={videoRef}
            src={INTRO.src}
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            style={{ objectPosition: `${x * 100}% ${y * 100}%` }}
          />
        ) : (
          <>
            {/* the environment the keyed character stands in */}
            <div className="absolute inset-0 bg-[#05060D]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(139,124,255,0.30),transparent_58%),radial-gradient(circle_at_50%_100%,rgba(94,230,208,0.16),transparent_60%)]" />
            <div className="absolute inset-0 grid place-items-center">
              <ChromaClip
                clip={INTRO.clip!}
                cap={cap}
                className="h-[86%] w-auto"
                onEnded={openPortal}
              />
            </div>
            {/* a hidden element so duration can still be read from the file */}
            <video
              ref={videoRef}
              src={clips[INTRO.clip!].url}
              muted
              playsInline
              preload="auto"
              className="pointer-events-none absolute h-px w-px opacity-0"
              onCanPlay={(ev) => void ev.currentTarget.play().catch(() => {})}
            />
          </>
        )}
      </motion.div>

      {/* ── the portal, on the edge of the hole ──────────── */}
      {opening && (
        <>
          <motion.div
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${radius * 2.1}vmax`,
              height: `${radius * 2.1}vmax`,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(139,124,255,0.55) 38%, rgba(94,230,208,0.35) 62%, transparent 72%)",
              filter: `blur(${10 + e * 26}px)`,
              opacity: 0.55 + 0.45 * (1 - e),
              mixBlendMode: "screen",
            }}
          />
          {/* the rim: thin, bright, and moving */}
          <motion.div
            className="pointer-events-none absolute rounded-full border"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${radius * 1.62}vmax`,
              height: `${radius * 1.62}vmax`,
              transform: "translate(-50%, -50%)",
              borderColor: "rgba(244,241,234,0.85)",
              borderWidth: Math.max(1, 4 * (1 - e)),
              boxShadow: `0 0 ${40 + e * 90}px rgba(139,124,255,0.9), inset 0 0 ${
                30 + e * 60
              }px rgba(94,230,208,0.7)`,
              opacity: 1 - e * 0.35,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}

      {/* ── if the browser refused sound ─────────────────── */}
      <AnimatePresence>
        {phase === "armed" && (
          <motion.button
            type="button"
            onClick={start}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-[2px]"
          >
            <span className="rounded-full border border-paper/40 px-8 py-3.5 text-sm font-medium tracking-[0.3em] text-paper transition hover:border-paper">
              ENTER
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── skip, for anyone who has seen it ─────────────── */}
      {!opening && (
        <button
          type="button"
          onClick={openPortal}
          className="absolute bottom-6 right-6 z-10 text-[11px] tracking-[0.3em] text-paper/40 transition hover:text-paper/90"
        >
          SKIP
        </button>
      )}

      {/* keeps the first moment from being a hard black rectangle */}
      {!ready && INTRO.mode === "scene" && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,124,255,0.10),transparent_60%)]" />
      )}
    </motion.div>
  );
}
