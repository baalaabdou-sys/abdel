"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CAPTIONS,
  END_BEAT,
  SCENES,
  SILENCE_BEAT,
  buildCues,
  ms,
  type Transition,
} from "@/data/adCut";
import { useCapability } from "../avatar/useCapability";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";
import FilmStage, { useStagePortrait } from "./FilmStage";
import Act2Player from "./act2/Act2Player";
import CursorBeat from "./act2/CursorBeat";
import Interstitial from "./act2/Interstitial";
import { AD_CLIPS } from "./adClips";
import { useAd } from "./AdContext";
import { Score } from "./score";

/**
 * The film.
 *
 * The portfolio is never navigated away from: this is a fixed layer over an
 * untouched page, scroll is frozen by cancelling the gesture rather than
 * moving the document, and the exact position is restored on close — so the
 * builder, the QR form and every selection are still where they were.
 *
 * Picture and sound share one clock. The score is scheduled up front on the
 * audio context and the visuals run off a timestamp taken at the same moment,
 * so a cut cannot drift away from the hit it was cut to.
 */
export default function AdPlayer() {
  const { open, runId, close, replay } = useAd();
  const prefersReducedMotion = useSafeReducedMotion();
  const cap = useCapability();
  const portrait = useStagePortrait();

  // act1 → interstitial → the silent cursor beat → act2 → the end card.
  const [state, setState] = useState<
    "loading" | "playing" | "interstitial" | "cursor" | "act2" | "ended"
  >("loading");
  const [act2Run, setAct2Run] = useState(0);
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audio, setAudio] = useState<string>("none");
  const mutedRef = useRef(false);

  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const score = useRef<Score | null>(null);
  const raf = useRef(0);
  const t0 = useRef(0);

  const total = ms(END_BEAT);

  /* ── scroll freeze, exactly as the other experiences do it ── */
  useEffect(() => {
    if (!open) return;
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("ad-open");
    const scrollAt = window.scrollY;
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("ad-open");
      if (Math.abs(window.scrollY - scrollAt) > 1) {
        window.scrollTo({ top: scrollAt, behavior: "auto" });
      }
    };
  }, [open, close]);

  /* ── run ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open || runId === 0) return;
    let cancelled = false;
    setState("loading");
    setScene(0);
    setElapsed(0);

    const first = videos.current[0];

    const begin = () => {
      if (cancelled) return;
      const s = new Score();
      score.current = s;
      void s.resume();
      s.start(buildCues());
      s.cutMusic(ms(SILENCE_BEAT));
      s.setMuted(mutedRef.current);
      setAudio(`${s.state}:${s.scheduled}`);

      t0.current = performance.now();
      setState("playing");

      const v = videos.current[0];
      if (v) {
        v.currentTime = 0;
        void v.play().catch(() => {});
      }

      const tick = () => {
        raf.current = requestAnimationFrame(tick);
        const e = performance.now() - t0.current;
        setElapsed(e);

        // Which shot are we on? Derived from the same beat grid the score is.
        let idx = 0;
        for (let i = SCENES.length - 1; i >= 0; i--) {
          if (e >= ms(SCENES[i].beat)) {
            idx = i;
            break;
          }
        }
        setScene((prev) => {
          if (prev !== idx) {
            const nv = videos.current[idx];
            if (nv) {
              nv.currentTime = 0;
              void nv.play().catch(() => {});
            }
            const ov = videos.current[prev];
            if (ov) ov.pause();
          }
          return idx;
        });

        if (e >= total) {
          cancelAnimationFrame(raf.current);
          // He stays alive on the final frame while the choice is offered.
          setState("interstitial");
        }
      };
      raf.current = requestAnimationFrame(tick);
    };

    // No black loading screen: the dark opening is the loading state, and it
    // only starts once there is enough of the first shot to run clean.
    if (first && first.readyState >= 3) {
      begin();
    } else if (first) {
      const onReady = () => begin();
      first.addEventListener("canplaythrough", onReady, { once: true });
      // Never strand someone on a slow connection.
      const bail = setTimeout(begin, 4000);
      return () => {
        cancelled = true;
        clearTimeout(bail);
        first.removeEventListener("canplaythrough", onReady);
        cancelAnimationFrame(raf.current);
        score.current?.close();
        score.current = null;
      };
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf.current);
      score.current?.close();
      score.current = null;
      videos.current.forEach((v) => v?.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId]);

  const toggleMute = useCallback(() => {
    // Side effect kept out of the updater so it fires once per press.
    const next = !mutedRef.current;
    mutedRef.current = next;
    score.current?.setMuted(next);
    setMuted(next);
  }, []);

  if (!open) return null;

  const active = SCENES[scene];
  const caption = CAPTIONS.filter((c) => elapsed >= ms(c.beat) && elapsed < ms(c.outBeat));
  const progress = Math.min(1, elapsed / total);

  return (
    <div
      // Surfaces the edit's position so the cut can be asserted in tests and
      // inspected in devtools.
      data-ad-scene={scene}
      data-ad-state={state}
      data-ad-audio={audio}
      className="fixed inset-0 z-[80] overflow-hidden bg-black"
    >
      {state === "act2" && (
        <Act2Player key={act2Run} muted={muted} onEnded={() => setState("ended")} />
      )}

      {/* ── the picture ─────────────────────────────────── */}
      <div style={{ visibility: state === "act2" ? "hidden" : "visible" }}>
      <FilmStage portrait={portrait}>
        {SCENES.map((s, i) => {
          // Only the current shot and its neighbours exist as loaded media.
          const near = Math.abs(i - scene) <= 1;
          return (
            <motion.div
              key={s.clip}
              className="absolute inset-0"
              initial={false}
              animate={i === scene ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.4 : 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: "none" }}
            >
              <video
                ref={(el) => {
                  videos.current[i] = el;
                }}
                src={near ? AD_CLIPS[s.clip].url : undefined}
                muted
                playsInline
                preload={i === 0 ? "auto" : near ? "auto" : "none"}
                className="h-full w-full object-cover"
              />
            </motion.div>
          );
        })}
      </FilmStage>
      </div>

      {/* ── the cut itself: a hit of movement on every arrival ── */}
      {!prefersReducedMotion && (
        <AnimatePresence>
          <motion.div
            key={`fx-${scene}`}
            className="pointer-events-none absolute inset-0"
            initial={enterFx(active.enter, active.dir ?? 1).from}
            animate={enterFx(active.enter, active.dir ?? 1).to}
            transition={{ duration: 0.42, ease: [0.2, 0, 0.1, 1] }}
          />
        </AnimatePresence>
      )}

      {/* ── grade: grain, vignette, scanlines ───────────── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(0,0,0,0.75)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* ── typography ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
        <AnimatePresence>
          {caption.map((c) => (
            <motion.div
              key={c.text}
              initial={{ opacity: 0, scale: c.kind === "huge" ? 1.35 : 1.06, y: c.kind === "cta" ? 18 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.22 } }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className={captionClass(c.kind)}
            >
              {c.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── the opening is the loading state ────────────── */}
      <AnimatePresence>
        {state === "loading" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <motion.span
              className="font-mono text-xs tracking-[0.4em] text-paper/40"
              animate={{ opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              . . .
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── controls ────────────────────────────────────── */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
        <button
          type="button"
          data-cursor-hover
          onClick={toggleMute}
          aria-pressed={muted}
          className="rounded-full border border-paper/25 bg-black/50 px-4 py-2 text-xs font-medium text-paper/90 backdrop-blur transition hover:border-paper/70"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          data-cursor-hover
          onClick={close}
          className="rounded-full border border-paper/25 bg-black/50 px-4 py-2 text-xs font-medium text-paper/90 backdrop-blur transition hover:border-paper/70"
        >
          Close
        </button>
      </div>

      {/* beat-accurate progress */}
      {state !== "act2" && (
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-paper/10">
        <div
          className="h-full bg-accent"
          style={{ width: `${progress * 100}%`, transition: "width 80ms linear" }}
        />
      </div>
      )}

      {/* ── between the acts ────────────────────────────── */}
      <AnimatePresence>
        {state === "interstitial" && (
          <Interstitial
            cap={cap}
            portrait={portrait}
            onContinue={() => setState("cursor")}
            onReplayAct1={() => {
              setState("loading");
              replay();
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>

      {state === "cursor" && (
        <CursorBeat cap={cap} portrait={portrait} onDone={() => setState("act2")} />
      )}

      {/* ── after ───────────────────────────────────────── */}
      <AnimatePresence>
        {state === "ended" && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-center font-display text-3xl text-paper sm:text-4xl">
              Let&apos;s build something.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:baalaabdou@gmail.com"
                data-cursor-hover
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
              >
                Start a project
              </a>
              <button
                type="button"
                data-cursor-hover
                onClick={() => {
                  setAct2Run((n) => n + 1);
                  setState("act2");
                }}
                className="rounded-full border border-paper/30 px-6 py-3 text-sm font-medium text-paper transition hover:border-paper/80"
              >
                Replay Act 2
              </button>
              <button
                type="button"
                data-cursor-hover
                onClick={() => {
                  setState("loading");
                  replay();
                }}
                className="rounded-full border border-paper/30 px-6 py-3 text-sm font-medium text-paper transition hover:border-paper/80"
              >
                Replay from Act 1
              </button>
              <button
                type="button"
                data-cursor-hover
                onClick={close}
                className="rounded-full px-5 py-3 text-sm text-haze underline-offset-4 transition hover:text-paper hover:underline"
              >
                Back to portfolio
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The transition, as a flash of movement laid over the cut. Each one matches
 * how the outgoing shot ended — a swipe hands off to a whip, a push into the
 * lens hands off to a punch through.
 */
function enterFx(t: Transition, dir: 1 | -1) {
  switch (t) {
    case "whip":
      return {
        from: { opacity: 0.9, x: `${dir * 40}%`, backgroundColor: "rgba(255,255,255,0.10)" },
        to: { opacity: 0, x: "0%", backgroundColor: "rgba(255,255,255,0)" },
      };
    case "flash":
      return {
        from: { opacity: 0.85, backgroundColor: "rgba(255,255,255,0.9)" },
        to: { opacity: 0, backgroundColor: "rgba(255,255,255,0)" },
      };
    case "through":
      return {
        from: { opacity: 0.8, scale: 2.4, backgroundColor: "rgba(94,230,208,0.35)" },
        to: { opacity: 0, scale: 1, backgroundColor: "rgba(94,230,208,0)" },
      };
    case "spin":
      return {
        from: { opacity: 0.7, rotate: 14, scale: 1.8, backgroundColor: "rgba(139,124,255,0.35)" },
        to: { opacity: 0, rotate: 0, scale: 1, backgroundColor: "rgba(139,124,255,0)" },
      };
    case "glitch":
      return {
        from: { opacity: 0.9, x: "6%", backgroundColor: "rgba(139,124,255,0.5)" },
        to: { opacity: 0, x: "0%", backgroundColor: "rgba(139,124,255,0)" },
      };
    default:
      return {
        from: { opacity: 1, backgroundColor: "rgba(0,0,0,1)" },
        to: { opacity: 0, backgroundColor: "rgba(0,0,0,0)" },
      };
  }
}

function captionClass(kind: string) {
  switch (kind) {
    case "huge":
      // One word, as big as the frame allows.
      return "w-full text-center font-display text-[18vw] font-bold leading-none tracking-tight text-paper drop-shadow-[0_0_60px_rgba(0,0,0,0.9)] sm:text-[13vw]";
    case "wide":
      // A phrase — sized so it still fits the frame on one line.
      return "w-full text-center font-display text-[9vw] font-bold leading-none tracking-tight text-paper drop-shadow-[0_0_60px_rgba(0,0,0,0.9)] sm:text-[6vw]";
    case "stamp":
      return "rounded-lg border-2 border-accent-soft bg-black/70 px-5 py-3 text-center font-mono text-base font-bold tracking-widest text-accent-soft sm:text-2xl";
    case "name":
      return "absolute bottom-[30%] left-0 right-0 text-center font-display text-[7vw] font-semibold leading-none tracking-tight text-paper sm:text-[4vw]";
    case "role":
      return "absolute bottom-[25%] left-0 right-0 text-center font-mono text-[2.6vw] tracking-[0.3em] text-accent-soft sm:text-[1.05vw]";
    default:
      return "absolute bottom-[15%] left-0 right-0 text-center font-display text-[5vw] font-bold tracking-tight text-paper sm:text-[2.4vw]";
  }
}
