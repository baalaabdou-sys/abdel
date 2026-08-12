"use client";

import { useEffect, useState } from "react";
import { useAvatarOff } from "./avatarPref";

/**
 * The escape hatch for a phone that cannot carry the character.
 *
 * Deliberately always reachable rather than buried in the About section:
 * someone whose device is struggling is not going to go looking for a
 * settings panel, and the whole point of this control is to be findable at
 * the moment the page feels bad.
 *
 * It hides itself while a full-screen experience is running — those cover
 * the page, carry their own controls, and are something the visitor chose to
 * start, so a floating button over the top of them is just clutter.
 */
export default function AvatarToggle() {
  const [off, setOff] = useAvatarOff();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setBusy(
        root.classList.contains("ad-open") ||
          root.classList.contains("brain-open") ||
          root.classList.contains("rb-running") ||
          root.classList.contains("intro-open")
      );
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  if (busy) return null;

  return (
    <button
      type="button"
      data-cursor-hover
      onClick={() => setOff(!off)}
      aria-pressed={off}
      title={
        off
          ? "Bring the animated character back"
          : "Turn the animated character off if this page feels slow"
      }
      aria-label={
        off
          ? "Show the animated character"
          : "Hide the animated character to improve performance"
      }
      // Above the character himself, so he can never end up covering the one
      // control that switches him off.
      className="fixed bottom-4 left-4 z-[75] flex items-center gap-2 rounded-full border border-ink-line bg-ink/80 px-3 py-2 text-[10px] tracking-[0.15em] text-haze opacity-60 backdrop-blur transition hover:border-accent/60 hover:text-paper hover:opacity-100 focus-visible:opacity-100 sm:bottom-6 sm:left-6"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <circle
          cx="12"
          cy="8"
          r="3.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {off && (
          <path
            d="M3.5 3.5 L20.5 20.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
      {off ? "SHOW CHARACTER" : "HIDE CHARACTER"}
    </button>
  );
}
