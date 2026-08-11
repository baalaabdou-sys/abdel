"use client";

import { useEffect, useRef } from "react";
import { useAvatarContext } from "./AvatarContext";

/**
 * The rare "site breaks and he fixes it" gag.
 *
 * Deliberately hard to trigger: it needs a long uninterrupted visit and then
 * fires at most once, so the people who see it feel like they found something
 * rather than sat through a scripted beat.
 */
export function useMalfunction(enabled: boolean) {
  const { play } = useAvatarContext();
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;

    // Somewhere between 22s and 38s of being on the page.
    const delay = 22000 + Math.random() * 16000;
    const timer = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;

      const targets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-glitchable]")
      ).slice(0, 4);
      if (!targets.length) return;

      targets.forEach((el, i) => {
        el.style.transition = "transform 220ms cubic-bezier(.36,.07,.19,.97), filter 220ms";
        el.style.transform = `translate(${(i % 2 ? -1 : 1) * (5 + i * 3)}px, ${i * 2}px) rotate(${
          (i % 2 ? -1 : 1) * (1.1 + i * 0.4)
        }deg)`;
        el.style.filter = "hue-rotate(18deg) saturate(1.25)";
      });
      document.documentElement.classList.add("is-glitching");

      // He notices, walks over, and shoves it all back into place.
      play("confused");

      setTimeout(() => {
        targets.forEach((el) => {
          el.style.transition = "transform 520ms cubic-bezier(.22,1,.36,1), filter 520ms";
          el.style.transform = "";
          el.style.filter = "";
        });
        document.documentElement.classList.remove("is-glitching");
        setTimeout(() => {
          targets.forEach((el) => {
            el.style.transition = "";
          });
        }, 600);
      }, 2600);
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, play]);
}
