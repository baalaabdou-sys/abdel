"use client";

import { useEffect } from "react";
import { useAvatarContext } from "./AvatarContext";
import { SECTION_CLIPS } from "./states";

const ORDER = ["hero", "work", "skills", "build", "about", "contact"];

/**
 * Warms only the clips the visitor is about to need.
 *
 * With fourteen clips, preloading everything would cost a phone several
 * megabytes before it shows anything. Instead each section warms itself plus
 * the one after it, so the next set piece is buffered by the time they scroll
 * into it and nothing further down the page is fetched early.
 */
export function usePredictivePreload(enabled: boolean) {
  const { warmClip } = useAvatarContext();

  useEffect(() => {
    if (!enabled) return;

    const warmFor = (id: string) => {
      const idx = ORDER.indexOf(id);
      if (idx === -1) return;
      [ORDER[idx], ORDER[idx + 1]]
        .filter(Boolean)
        .flatMap((s) => SECTION_CLIPS[s] ?? [])
        .forEach(warmClip);
    };

    // Hero's own clips matter immediately.
    warmFor("hero");

    const els = ORDER.map((id) => document.getElementById(id === "hero" ? "top" : id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.id === "top" ? "hero" : e.target.id;
          warmFor(id);
        });
      },
      { rootMargin: "400px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, warmClip]);
}
