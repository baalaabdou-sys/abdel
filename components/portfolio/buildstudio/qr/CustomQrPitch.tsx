"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QR_SHOWCASE, type QrShowcaseItem } from "@/data/qrShowcase";
import { useAvatarContext } from "../../avatar/AvatarContext";
import MagneticButton from "../../MagneticButton";

const INSTANT = [
  "Generated instantly, right here in the browser",
  "Basic customisation — colours, shape, logo",
  "Perfect for links, Wi-Fi, menus and social",
  "Yours to download and use straight away",
];

const CUSTOM = [
  "Designed from scratch around your brand",
  "Logo integration and custom typography",
  "Decorative frames, borders and illustrations",
  "Branded backgrounds and full composition",
  "Built into posters, menus, cards and signage",
  "Far more creative than any generator",
];

function Check({ premium }: { premium?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`mt-0.5 h-4 w-4 shrink-0 ${premium ? "text-accent-soft" : "text-haze/70"}`}
    >
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Placeholder artwork for showcase entries that have no image yet. */
function PlaceholderTile() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-soft via-ink to-ink-soft">
      <svg viewBox="0 0 48 48" className="h-12 w-12 text-ink-line" aria-hidden>
        <g fill="currentColor">
          <rect x="4" y="4" width="14" height="14" rx="3" />
          <rect x="30" y="4" width="14" height="14" rx="3" />
          <rect x="4" y="30" width="14" height="14" rx="3" />
          <rect x="24" y="24" width="5" height="5" rx="1.5" />
          <rect x="33" y="24" width="5" height="5" rx="1.5" />
          <rect x="24" y="33" width="5" height="5" rx="1.5" />
          <rect x="33" y="33" width="5" height="5" rx="1.5" />
          <rect x="39" y="30" width="5" height="5" rx="1.5" />
        </g>
      </svg>
    </div>
  );
}

export default function CustomQrPitch() {
  const prefersReducedMotion = useReducedMotion();
  const { requestAction } = useAvatarContext();
  const [active, setActive] = useState<QrShowcaseItem | null>(null);

  // Close on Escape and lock background scroll while the lightbox is open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  const open = (item: QrShowcaseItem) => {
    setActive(item);
    if (!prefersReducedMotion) requestAction("point_action", { holdMs: 1800 });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="mt-16 border-t border-ink-line pt-14"
      aria-labelledby="custom-qr-heading"
    >
      <p className="text-sm font-medium tracking-wide text-accent">Beyond the demo</p>
      <h3
        id="custom-qr-heading"
        className="mt-3 max-w-2xl font-display text-3xl text-paper sm:text-4xl"
      >
        The builder is only the beginning.
      </h3>
      <p className="mt-4 max-w-3xl leading-relaxed text-haze">
        The QR above is generated instantly as a demo. For real client projects
        I design fully custom branded QR pieces — custom layouts, logos,
        typography, colours, illustrations, decorative frames, business
        identity, menu branding, social styling, event themes and more — while
        keeping the code completely scannable.
      </p>

      {/* ── two tiers ─────────────────────────────── */}
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-line bg-ink/50 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h4 className="font-display text-xl text-paper">Instant QR</h4>
            <span className="rounded-full border border-ink-line px-3 py-1 text-[10px] uppercase tracking-wider text-haze">
              What you just made
            </span>
          </div>
          <ul className="mt-5 space-y-2.5">
            {INSTANT.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm text-haze">
                <Check />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-accent/45 bg-gradient-to-br from-accent/12 via-ink/60 to-accent-soft/10 p-6 shadow-[0_25px_70px_-35px_rgba(139,124,255,0.75)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-baseline justify-between gap-4">
            <h4 className="font-display text-xl text-paper">Fully Custom QR Design</h4>
            <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
              Bespoke
            </span>
          </div>
          <ul className="relative mt-5 space-y-2.5">
            {CUSTOM.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm text-paper/90">
                <Check premium />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── gallery ───────────────────────────────── */}
      <div className="mt-14">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h4 className="font-display text-2xl text-paper">Custom work</h4>
          <p className="text-sm text-haze">Tap an example to see it up close.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QR_SHOWCASE.map((item, i) => (
            <motion.button
              key={item.slug}
              type="button"
              data-cursor-hover
              onClick={() => open(item)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.07 }}
              className="group overflow-hidden rounded-2xl border border-ink-line bg-ink/50 text-left transition duration-300 hover:-translate-y-1 hover:border-accent/55 hover:shadow-[0_22px_55px_-28px_rgba(139,124,255,0.6)]"
              aria-label={`View ${item.title}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <PlaceholderTile />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] uppercase tracking-wider text-accent-soft backdrop-blur">
                  {item.category}
                </span>
              </div>
              <div className="p-4">
                <p className="font-medium text-paper">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-haze">
                  {item.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────── */}
      <div className="mt-12 rounded-2xl border border-ink-line bg-ink/50 p-8 text-center">
        <p className="font-display text-2xl text-paper">Want something completely custom?</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-haze">
          Tell me where it needs to live — a table, a window, a poster, a card —
          and I&apos;ll design the whole piece around it.
        </p>
        <MagneticButton
          href="#contact"
          className="mt-6 inline-flex rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-soft"
        >
          Let&apos;s design yours
        </MagneticButton>
      </div>

      {/* ── lightbox ──────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-lightbox-title"
            onClick={() => setActive(null)}
          >
            <div className="absolute inset-0 bg-ink/85 backdrop-blur-md" />

            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-ink-line bg-ink-soft shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]"
            >
              <button
                type="button"
                onClick={() => setActive(null)}
                autoFocus
                aria-label="Close"
                data-cursor-hover
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-line bg-ink/80 text-haze backdrop-blur transition hover:border-accent hover:text-accent"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className="aspect-[4/3] w-full overflow-hidden bg-ink">
                {active.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.image}
                    alt={active.title}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <PlaceholderTile />
                )}
              </div>

              <div className="p-6 sm:p-7">
                <span className="text-[11px] uppercase tracking-wider text-accent-soft">
                  {active.category}
                </span>
                <h5 id="qr-lightbox-title" className="mt-2 font-display text-2xl text-paper">
                  {active.title}
                </h5>
                <p className="mt-3 leading-relaxed text-haze">{active.description}</p>
                <MagneticButton
                  href="#contact"
                  onClick={() => setActive(null)}
                  className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
                >
                  Design something like this
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
