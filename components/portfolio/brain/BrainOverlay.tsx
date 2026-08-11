"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "../avatar/AvatarContext";
import { useCapability } from "../avatar/useCapability";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";
import { playCue } from "../rebuild/sound";
import { FRAGMENTS, type Region, type Thought } from "@/data/brainThoughts";
import { useBrain } from "./BrainContext";
import ThoughtDetail from "./ThoughtDetail";
import Tunnel from "./Tunnel";
import World from "./World";

/**
 * "Enter my brain".
 *
 * The portfolio does not navigate anywhere — this is a fixed overlay above the
 * untouched page. Nothing below it unmounts, scroll is frozen by cancelling
 * the gesture rather than moving the document, and the exact scroll position
 * is restored on the way out, so every section, form value and selection is
 * where the visitor left it.
 */

/** Beats of the way in, ms from the press. */
const IN = { lens: 1700, tunnel: 3100, flood: 5300, organise: 7100, world: 8700 };
/** Beats of the way out, ms from pressing "back to reality". */
const OUT = { tunnel: 650, lens: 2000, page: 2850, gag: 3250, done: 6000 };

export default function BrainOverlay() {
  const { phase, setPhase, runId, open } = useBrain();
  const { play } = useAvatarContext();
  const cap = useCapability();
  const prefersReducedMotion = useSafeReducedMotion();

  const [region, setRegion] = useState<Region>("apps");
  const [detail, setDetail] = useState<Thought | null>(null);
  const [flood, setFlood] = useState<"none" | "chaos" | "sorted">("none");
  const [gag, setGag] = useState(false);
  const [portrait, setPortrait] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // He is in here too, and this anchor is the only one that exists while the
  // overlay is up, so the stage keeps him centre frame.
  const anchorRef = useAvatarAnchor("brain", {
    basePose: phase === "world" || phase === "flood" ? "brain_idle" : "idle",
    size: 420,
    exclusive: true,
  });

  /* ── scroll freeze ──────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "Escape") setPhase("exit");
    };
    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("brain-open");
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("brain-open");
    };
  }, [open, setPhase]);

  /* ── the way in ─────────────────────────────────────────── */
  useEffect(() => {
    if (runId === 0) return;
    const scrollAt = window.scrollY;
    setPortrait(window.innerWidth < 768);
    setRegion("apps");
    setDetail(null);
    setFlood("none");
    setGag(false);

    const cleanup = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (Math.abs(window.scrollY - scrollAt) > 1) {
        window.scrollTo({ top: scrollAt, behavior: "auto" });
      }
    };

    if (prefersReducedMotion) {
      // Straight in, no tunnel, no flood — the same place, calmly reached.
      setPhase("world");
      return cleanup;
    }

    // 1–7: he looks at you, decides, taps his glasses, and the lens takes over.
    play("brain_invite", { force: true, holdMs: IN.lens });
    playCue("glitch");
    at(IN.lens, () => setPhase("lens"));
    at(IN.tunnel, () => {
      setPhase("tunnel");
      playCue("css");
    });
    at(IN.flood, () => {
      setPhase("flood");
      setFlood("chaos");
      play("brain_arrange", { force: true, holdMs: 3400 });
    });
    at(IN.organise, () => {
      setFlood("sorted");
      playCue("snap");
    });
    at(IN.world, () => {
      setPhase("world");
      setFlood("none");
    });

    return cleanup;
    // Keyed on the activation counter only: the timeline sets `phase` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  /* ── the way out ────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "exit") return;
    setDetail(null);
    play("brain_pull", { force: true, holdMs: OUT.lens });
    playCue("glitch");

    at(OUT.gag, () => {
      // One thought gets out with you. He notices.
      setGag(true);
      play("brain_catch", { force: true, holdMs: 2400 });
      playCue("fall");
    });
    at(OUT.done, () => {
      setGag(false);
      setPhase("closed");
    });
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const openThought = useCallback(
    (t: Thought) => {
      setDetail(t);
      if (t.region === "secret") {
        // He is not ready to show that one.
        play("brain_hide", { force: true, holdMs: 2600 });
        playCue("glitch");
        timers.current.push(setTimeout(() => setDetail(null), 2200));
      } else {
        play("brain_present", { force: true, holdMs: 3000 });
        playCue("snap");
      }
    },
    [play]
  );

  const chaos = useMemo(
    () =>
      Array.from({ length: cap.tier === "minimal" ? 14 : portrait ? 20 : 30 }, (_, i) => ({
        text: FRAGMENTS[(i * 3) % FRAGMENTS.length],
        // where it lands once he tidies up
        gx: 8 + (i % 6) * 15,
        gy: 24 + Math.floor(i / 6) * 11,
        // where it is while everything is happening at once
        cx: 6 + Math.random() * 88,
        cy: 12 + Math.random() * 74,
        r: (Math.random() * 2 - 1) * 22,
      })),
    [cap.tier, portrait]
  );

  if (!open) return null;

  const inWorld = phase === "flood" || phase === "world";
  const tunnelling = phase === "tunnel" || (phase === "exit" && true);

  return (
    <div
      // Always interactive: the sections underneath are still mounted, and a
      // stray hover down there would pull him out of the scene.
      className="fixed inset-0 z-[55]"
    >
      {/* ── the real page dimming behind the lens ─────────── */}
      <motion.div
        className="absolute inset-0 bg-[#05060D]"
        initial={{ opacity: 0 }}
        animate={{
          opacity:
            phase === "invite" ? 0.45 : phase === "lens" ? 0.85 : phase === "exit" ? 0.4 : 1,
        }}
        transition={{ duration: phase === "exit" ? 0.9 : 0.7 }}
      />

      {/* ── the lens we fall through ──────────────────────── */}
      <AnimatePresence>
        {(phase === "invite" || phase === "lens" || phase === "exit") && (
          <motion.div
            key="lens"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-accent-soft/60"
            initial={{ width: 90, height: 90, opacity: 0 }}
            animate={
              phase === "invite"
                ? { width: 150, height: 150, opacity: 1 }
                : phase === "lens"
                ? { width: 2600, height: 2600, opacity: 1 }
                : { width: 120, height: 120, opacity: 0 }
            }
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: phase === "lens" ? 1.3 : 0.85, ease: [0.5, 0, 0.75, 0] }}
          >
            {/* what is reflected in it */}
            <div className="absolute inset-0 bg-[#05060D]" />
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-mono text-[10px] leading-tight text-accent-soft/80"
              animate={{ y: [0, -220] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              {FRAGMENTS.concat(FRAGMENTS).map((f, i) => (
                <span key={i}>{f}</span>
              ))}
            </motion.div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_35%,rgba(5,6,13,0.95)_78%)]" />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ boxShadow: ["inset 0 0 60px rgba(94,230,208,0.35)", "inset 0 0 120px rgba(94,230,208,0.75)", "inset 0 0 60px rgba(94,230,208,0.35)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── travelling ───────────────────────────────────── */}
      <AnimatePresence>
        {tunnelling && !prefersReducedMotion && (
          <motion.div
            key="tunnel"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <Tunnel
              count={cap.tier === "minimal" ? 22 : portrait ? 30 : 48}
              direction={phase === "exit" ? "out" : "in"}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── the mind ─────────────────────────────────────── */}
      <AnimatePresence>
        {inWorld && (
          <motion.div
            key="world"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.25 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3, transition: { duration: 0.5 } }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <World
              region={region}
              setRegion={setRegion}
              onOpen={openThought}
              // `particles` is a multiplier, not a count.
              particles={Math.round(46 * cap.particles)}
              portrait={portrait}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── too many ideas at once, then he tidies them ───── */}
      <AnimatePresence>
        {flood !== "none" &&
          chaos.map((c, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute rounded-md border border-accent/40 bg-ink/70 px-2 py-1 font-mono text-[10px] text-accent-soft sm:text-xs"
              initial={{ opacity: 0, left: "50%", top: "50%", rotate: 0, scale: 0.4 }}
              animate={
                flood === "chaos"
                  ? {
                      opacity: 1,
                      left: `${c.cx}%`,
                      top: `${c.cy}%`,
                      rotate: c.r,
                      scale: 1,
                    }
                  : { opacity: 1, left: `${c.gx}%`, top: `${c.gy}%`, rotate: 0, scale: 0.92 }
              }
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.35 } }}
              transition={{
                duration: flood === "chaos" ? 0.5 : 0.75,
                delay: flood === "chaos" ? i * 0.045 : i * 0.02,
                ease: flood === "chaos" ? "easeOut" : [0.16, 1, 0.3, 1],
              }}
            >
              {c.text}
            </motion.span>
          ))}
      </AnimatePresence>

      {/* He is in here, and this is where he stands. Purely a position
          marker — it must never eat a tap meant for a thought behind it. */}
      <div
        ref={anchorRef}
        className={`pointer-events-none absolute h-52 w-40 ${
          portrait
            ? "bottom-[30%] left-1/2 -translate-x-1/2"
            : "bottom-[16%] right-[16%]"
        }`}
      />

      {/* one thought comes back out with you */}
      <AnimatePresence>
        {gag && (
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-accent-soft/70 bg-ink/80 px-3 py-1.5 font-mono text-[11px] text-accent-soft"
            initial={{ opacity: 0, x: -20, y: -80, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-20, 40, 30, 0], y: [-80, -120, -100, -70], scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, times: [0, 0.2, 0.7, 1] }}
          >
            one more idea
          </motion.span>
        )}
      </AnimatePresence>

      {/* ── what you opened ──────────────────────────────── */}
      <AnimatePresence>
        {detail && (
          <ThoughtDetail
            thought={detail}
            portrait={portrait}
            onClose={() => setDetail(null)}
          />
        )}
      </AnimatePresence>

      {/* ── the way home ─────────────────────────────────── */}
      {phase === "world" && (
        <motion.button
          type="button"
          data-cursor-hover
          onClick={() => setPhase("exit")}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute right-4 top-5 z-30 rounded-full border border-ink-line bg-ink/85 px-5 py-2.5 text-xs font-medium text-paper backdrop-blur transition hover:border-accent-soft hover:text-accent-soft sm:right-8 sm:top-8 sm:text-sm"
        >
          Back to reality
        </motion.button>
      )}
    </div>
  );
}
