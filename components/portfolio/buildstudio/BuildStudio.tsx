"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CATEGORIES, KINDS, getCategory, type BuildKind } from "@/data/buildPaths";
import { useAvatarAnchor, useAvatarContext } from "../avatar/AvatarContext";
import MagneticButton from "../MagneticButton";
import WebsiteMockup from "./WebsiteMockup";
import AppMockup from "./AppMockup";
import QrStudio from "./qr/QrStudio";

type Stage = "kind" | "category" | "building" | "reveal" | "qr";

const BUILD_MS = 2600;
const HOLD_MS = 6500;

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

export default function BuildStudio() {
  const prefersReducedMotion = useReducedMotion();
  const { requestAction, warmClip } = useAvatarContext();
  const anchorRef = useAvatarAnchor("build", { basePose: "idle_loop", size: 260 });
  const sectionRef = useRef<HTMLElement>(null);

  const [stage, setStage] = useState<Stage>("kind");
  const [kind, setKind] = useState<BuildKind | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Start buffering the build clips once the section is near the viewport, so
  // the animation starts instantly when a visitor actually picks something.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || prefersReducedMotion) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warmClip("build_website");
          warmClip("build_app");
          warmClip("build_qr");
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [warmClip, prefersReducedMotion]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pickKind = (k: BuildKind) => {
    setKind(k);
    // QR runs its own multi-step studio (purpose → customise → build → real,
    // scannable output) rather than the prebuilt category → mockup path.
    setStage(k === "qr" ? "qr" : "category");
  };

  const pickCategory = (categorySlug: string) => {
    if (!kind) return;
    setSlug(categorySlug);
    setStage("building");

    const clip = KINDS.find((k) => k.kind === kind)?.clip;
    if (clip && !prefersReducedMotion) requestAction(clip, { holdMs: HOLD_MS });

    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStage("reveal"), BUILD_MS);
  };

  const reset = () => {
    clearTimeout(timer.current);
    setStage("kind");
    setKind(null);
    setSlug(null);
  };

  const category = kind && slug ? getCategory(kind, slug) : undefined;
  const showStage = stage === "building" || stage === "reveal";

  return (
    <section
      ref={sectionRef}
      id="build"
      className="relative overflow-hidden border-t border-ink-line bg-ink-soft px-6 py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(94,230,208,0.08),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-accent">Interactive</p>
          <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
            What should I build for you?
          </h2>
          <p className="mt-4 text-haze">
            Pick a path and watch it come together.
          </p>
        </div>

        {stage === "qr" ? (
          <div className="relative">
            <div
              ref={anchorRef}
              className="pointer-events-none absolute -top-6 right-0 h-40 w-32 sm:h-52 sm:w-40"
            />
            <QrStudio onRestart={reset} />
          </div>
        ) : (
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          {/* ── choice panel ───────────────────────────── */}
          <div className="min-h-[280px]">
            <AnimatePresence mode="wait">
              {stage === "kind" && (
                <motion.div key="kind" {...fade}>
                  <p className="mb-4 text-xs font-medium uppercase tracking-wider text-haze">
                    Step 1 — pick a type
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {KINDS.map((k) => (
                      <button
                        key={k.kind}
                        type="button"
                        data-cursor-hover
                        onClick={() => pickKind(k.kind)}
                        className="group rounded-2xl border border-ink-line bg-ink/60 p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_50px_-25px_rgba(139,124,255,0.6)]"
                      >
                        <p className="font-display text-xl text-paper">{k.label}</p>
                        <p className="mt-1.5 text-sm text-haze">{k.hint}</p>
                        <span className="mt-4 inline-block text-sm text-accent opacity-0 transition group-hover:opacity-100">
                          Choose →
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {stage === "category" && kind && kind !== "qr" && (
                <motion.div key="category" {...fade}>
                  <div className="mb-4 flex items-center gap-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-haze">
                      Step 2 — what kind?
                    </p>
                    <button
                      type="button"
                      onClick={reset}
                      data-cursor-hover
                      className="text-xs text-haze underline-offset-4 transition hover:text-accent hover:underline"
                    >
                      back
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CATEGORIES[kind].map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        data-cursor-hover
                        onClick={() => pickCategory(c.slug)}
                        className="group rounded-2xl border border-ink-line bg-ink/60 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-accent-soft/60 hover:shadow-[0_20px_50px_-25px_rgba(94,230,208,0.5)]"
                      >
                        <p className="font-medium text-paper">{c.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-haze">{c.blurb}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {showStage && category && (
                <motion.div key="result" {...fade}>
                  <p className="text-xs font-medium uppercase tracking-wider text-accent-soft">
                    {stage === "building" ? "Building…" : "Ready"}
                  </p>
                  <h3 className="mt-3 font-display text-3xl text-paper">{category.label}</h3>
                  <p className="mt-2 text-haze">{category.blurb}</p>

                  <AnimatePresence>
                    {stage === "reveal" && (
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="mt-7 flex flex-wrap items-center gap-4"
                      >
                        <MagneticButton
                          href="#contact"
                          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
                        >
                          Let&apos;s build yours
                        </MagneticButton>
                        <button
                          type="button"
                          onClick={reset}
                          data-cursor-hover
                          className="text-sm text-haze underline-offset-4 transition hover:text-accent hover:underline"
                        >
                          Try another
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── stage: mockup assembling + character anchor ─── */}
          <div className="relative flex min-h-[360px] items-center justify-center">
            {/* Keeps the character inside the stage column so his glow never
                bleeds over the copy in the left column. */}
            <div
              ref={anchorRef}
              className="pointer-events-none absolute bottom-0 left-0 h-40 w-32 sm:h-52 sm:w-40"
            />

            <AnimatePresence mode="wait">
              {showStage && kind && slug ? (
                <motion.div
                  key={`${kind}-${slug}`}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-lg"
                >
                  {kind === "website" ? (
                    <WebsiteMockup variant={slug} />
                  ) : (
                    <AppMockup variant={slug} />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-[300px] w-full max-w-lg items-center justify-center rounded-2xl border border-dashed border-ink-line/70"
                >
                  <p className="px-8 text-center text-sm text-haze/70">
                    Your pick gets built right here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
