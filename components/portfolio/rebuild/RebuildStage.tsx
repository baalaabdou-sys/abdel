"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAvatarAnchor, useAvatarContext } from "../avatar/AvatarContext";
import { useSafeReducedMotion } from "../avatar/useSafeReducedMotion";
import { useRebuild } from "./RebuildContext";
import { collectPieces, drift, restore, scatter, settle, type Piece } from "./pieces";
import { playCue } from "./sound";

type Chip = { id: number; tag: string; x: number; y: number; w: number; h: number; i: number };
type Ring = { id: number; x: number; y: number };

/** Beat timings, in ms from the moment the button is pressed. */
const T = {
  reach: 1000,
  shatter: 1750,
  survey: 3150,
  rebuild: 4400,
  css: 8100,
  drop: 9100,
  outro: 11300,
  end: 13900,
};

export default function RebuildStage() {
  const { phase, runId, setPhase, setPlayed } = useRebuild();
  const { play } = useAvatarContext();
  const prefersReducedMotion = useSafeReducedMotion();
  const anchorRef = useAvatarAnchor("rebuild", { basePose: "idle", size: 460 });

  const [chips, setChips] = useState<Chip[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [cssBlock, setCssBlock] = useState(false);
  const [slab, setSlab] = useState<"in" | "slam" | null>(null);
  const [flash, setFlash] = useState(false);
  const [portrait, setPortrait] = useState(false);

  const pieces = useRef<Piece[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(1);

  const running = phase !== "idle";

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const ring = useCallback((x: number, y: number) => {
    const id = nextId.current++;
    setRings((r) => [...r, { id, x, y }]);
    setTimeout(() => setRings((r) => r.filter((v) => v.id !== id)), 700);
  }, []);

  /* ── scroll freeze ─────────────────────────────────────────────
     The gesture is cancelled rather than the body being repositioned, so
     window.scrollY never changes and the visitor is returned to the exact
     pixel they triggered this from. */
  useEffect(() => {
    if (!running) return;
    const stop = (e: Event) => e.preventDefault();
    const keys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
    const onKey = (e: KeyboardEvent) => {
      if (keys.has(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("rb-running");
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("rb-running");
    };
  }, [running]);

  /* ── the sequence ──────────────────────────────────────────── */
  useEffect(() => {
    if (runId === 0) return;

    const root = document.documentElement;
    const isPortrait = window.innerWidth < 768;
    // Belt and braces on the promise that you end up exactly where you were:
    // whatever the page does in between, this is the position restored.
    const scrollAt = window.scrollY;
    setPortrait(isPortrait);
    pieces.current = collectPieces();

    const cleanup = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      root.classList.remove("rb-wire", "rb-glitch", "rb-restyle", "rb-snap");
      restore(pieces.current);
      pieces.current = [];
      if (Math.abs(window.scrollY - scrollAt) > 1) {
        window.scrollTo({ top: scrollAt, behavior: "auto" });
      }
      setChips([]);
      setRings([]);
      setCssBlock(false);
      setSlab(null);
      setFlash(false);
    };

    // Reduced motion still gets the idea — the page shows its raw structure
    // and comes back — but without shudder, flashing or flying debris.
    if (prefersReducedMotion) {
      root.classList.add("rb-wire");
      at(1800, () => {
        root.classList.remove("rb-wire");
        root.classList.add("rb-restyle");
      });
      at(2600, () => {
        setPhase("idle");
        setPlayed(true);
        cleanup();
      });
      return cleanup;
    }

    /* 1–2 — he notices, and looks at you like you just handed him a hammer. */
    play("noticing", { force: true, holdMs: 900 });
    at(700, () => play("permission", { force: true, holdMs: 1100 }));

    /* 3–4 — he reaches into the interface and the page starts to fail. */
    at(T.reach, () => {
      setPhase("reach");
      play("reaching", { force: true, holdMs: 1200 });
      root.classList.add("rb-glitch");
      playCue("glitch");
    });

    /* 5–6 — it comes apart into the pieces it was actually built from. */
    at(T.shatter, () => {
      setPhase("shatter");
      root.classList.add("rb-wire");
      scatter(pieces.current, isPortrait);
      playCue("glitch");
      setChips(
        pieces.current.slice(0, isPortrait ? 9 : 14).map((p, i) => ({
          id: nextId.current++,
          tag: p.tag,
          x: p.rect.left + p.rect.width / 2,
          y: p.rect.top + p.rect.height / 2,
          w: p.rect.width,
          h: p.rect.height,
          i,
        }))
      );
      pieces.current.forEach((_, i) => at(T.shatter + 90 + i * 70, () => playCue("fall")));
    });
    at(T.shatter + 520, () => root.classList.remove("rb-glitch"));

    /* 7 — he looks at what he has done. */
    at(T.survey, () => {
      setPhase("survey");
      play("confused", { force: true, holdMs: 1250 });
      drift(pieces.current, isPortrait);
    });

    /* 8 — and puts the same portfolio back, piece by piece. */
    at(T.rebuild, () => {
      setPhase("rebuild");
      setChips([]);
      const list = pieces.current;
      const step = Math.min(230, (T.css - T.rebuild - 400) / Math.max(1, list.length));
      list.forEach((p, i) => {
        // Every piece starts travelling now; the stagger lives in the
        // transition delay so the snaps land one after another.
        settle(p, i * step);
        at(T.rebuild + i * step + 40, () => {
          const r = p.el.getBoundingClientRect();
          ring(r.left + r.width / 2, r.top + r.height / 2);
          playCue("snap");
          // Grab, place, grab, place — he works his way down the page.
          play(i % 2 ? "grabbing" : "throwing", { force: true, holdMs: step + 120 });
        });
      });
    });

    /* 9 — the styling arrives as one thrown block, and lands. */
    at(T.css, () => {
      setPhase("css");
      play("throwing", { force: true, holdMs: 900 });
      setCssBlock(true);
    });
    at(T.css + 560, () => {
      root.classList.remove("rb-wire");
      root.classList.add("rb-restyle");
      setCssBlock(false);
      setFlash(true);
      playCue("css");
      ring(window.innerWidth / 2, window.innerHeight / 2);
    });
    at(T.css + 700, () => setFlash(false));
    at(T.css + 1400, () => root.classList.remove("rb-restyle"));

    /* 10 — <Portfolio /> itself, slammed back into the middle of the page. */
    at(T.drop, () => {
      setPhase("drop");
      setSlab("in");
    });
    at(T.drop + 900, () => {
      play("slamming", { force: true, holdMs: 1400 });
      setSlab("slam");
    });
    at(T.drop + 1450, () => {
      setSlab(null);
      setFlash(true);
      playCue("boom");
      root.classList.add("rb-snap");
      ring(window.innerWidth / 2, window.innerHeight / 2);
    });
    at(T.drop + 1600, () => setFlash(false));
    at(T.drop + 2000, () => root.classList.remove("rb-snap"));

    /* 11 — checks his work, fixes his glasses, leaves. */
    at(T.outro, () => {
      setPhase("outro");
      play("signing_off", { force: true, holdMs: 2400 });
      playCue("glasses");
    });

    at(T.end, () => {
      setPhase("idle");
      setPlayed(true);
      cleanup();
    });

    return cleanup;
    // Keyed on the activation counter, never on `phase`: the timeline sets the
    // phase itself, so depending on it would tear the whole sequence down on
    // the first beat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (!running) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {/* He needs to be centre stage while this runs, so the sequence owns an
          anchor of its own that outranks the section anchors. */}
      <div
        ref={anchorRef}
        className="absolute left-1/2 top-1/2 h-56 w-40 -translate-x-1/2 -translate-y-1/2"
      />

      {/* scanlines + chromatic split while it is failing */}
      <AnimatePresence>
        {(phase === "reach" || phase === "shatter") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(139,124,255,0.10) 0 1px, transparent 1px 3px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* the raw parts, labelled with what they actually are */}
      <AnimatePresence>
        {chips.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.6, x: c.x, y: c.y }}
            animate={{
              opacity: 1,
              scale: 1,
              x: c.x + (portrait ? 0 : (c.i % 2 ? -1 : 1) * 40),
              y: c.y + (portrait ? (c.i % 3) * 14 : 0),
            }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
            transition={{ duration: 0.45, delay: c.i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md border border-accent/50 bg-ink/85 px-2 py-1 font-mono text-[11px] text-accent-soft backdrop-blur-[2px] sm:text-xs"
          >
            {c.tag}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* impact rings wherever a piece snaps home */}
      <AnimatePresence>
        {rings.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0.75, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            style={{ left: r.x, top: r.y }}
            className="absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-soft/70"
          />
        ))}
      </AnimatePresence>

      {/* the CSS block, thrown at the interface */}
      <AnimatePresence>
        {cssBlock && (
          <motion.pre
            initial={{
              opacity: 0,
              scale: 0.4,
              x: portrait ? 0 : -window.innerWidth * 0.35,
              y: portrait ? window.innerHeight * 0.4 : 120,
              rotate: -14,
            }}
            animate={{ opacity: 1, scale: portrait ? 1.35 : 1.6, x: 0, y: 0, rotate: 4 }}
            exit={{ opacity: 0, scale: 2.4, transition: { duration: 0.16 } }}
            transition={{ duration: 0.55, ease: [0.3, 0, 0.2, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-accent-soft/70 bg-ink/90 px-4 py-3 font-mono text-[10px] leading-relaxed text-accent-soft shadow-[0_0_60px_rgba(94,230,208,0.35)] sm:text-xs"
          >
{`.portfolio {
  display: grid;
  color: #F4F1EA;
  box-shadow: 0 20px 60px;
}`}
          </motion.pre>
        )}
      </AnimatePresence>

      {/* <Portfolio /> — on a phone it very nearly fills the screen first */}
      <AnimatePresence>
        {slab && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: -60, rotate: -6 }}
            animate={
              slab === "in"
                ? { opacity: 1, scale: portrait ? 1.05 : 1, y: 0, rotate: 0 }
                : { opacity: 1, scale: 0.42, y: 90, rotate: 0 }
            }
            exit={{ opacity: 0, scale: 0.25, transition: { duration: 0.12 } }}
            transition={
              slab === "in"
                ? { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.42, ease: [0.6, 0, 0.9, 0.4] }
            }
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: portrait ? "88vw" : "min(520px, 60vw)" }}
          >
            <div className="rounded-2xl border-2 border-accent/80 bg-ink/95 px-6 py-10 text-center shadow-[0_0_120px_rgba(139,124,255,0.55)]">
              <p className="font-mono text-2xl text-accent sm:text-3xl">&lt;Portfolio /&gt;</p>
              <p className="mt-2 font-mono text-[10px] text-haze sm:text-xs">
                default export · ready
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-paper"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
