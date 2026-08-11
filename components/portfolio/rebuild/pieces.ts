"use client";

/**
 * The real page, treated as a set of movable pieces.
 *
 * Nothing here unmounts, reorders or rewrites the DOM — every piece is moved
 * with an inline transform whose previous value is recorded first, so putting
 * the page back is a literal restore of what was there. That is what keeps
 * scroll position, form values and component state intact while the character
 * appears to demolish the site.
 */

export type Piece = {
  el: HTMLElement;
  /** What this really is in the source: `<nav>`, `<ProjectCard />`, … */
  tag: string;
  /** Viewport rect at capture time, for the floating tag chips. */
  rect: DOMRect;
  /** Saved inline style, restored verbatim when the sequence ends. */
  prevStyle: string;
  /** Order in the rebuild, low first (nav snaps back before the footer). */
  order: number;
};

/** Only pieces near the viewport are moved — offscreen work is invisible. */
export function collectPieces(): Piece[] {
  const vh = window.innerHeight;
  return Array.from(document.querySelectorAll<HTMLElement>("[data-rb-scatter]"))
    .map((el) => ({
      el,
      tag: el.dataset.rbTag || "<div>",
      rect: el.getBoundingClientRect(),
      prevStyle: el.getAttribute("style") || "",
      order: Number(el.dataset.rbOrder ?? 50),
    }))
    .filter(
      (p) =>
        p.rect.width > 0 &&
        p.rect.height > 0 &&
        p.rect.bottom > -vh * 0.5 &&
        p.rect.top < vh * 1.5
    )
    .sort((a, b) => a.order - b.order || a.rect.top - b.rect.top);
}

const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
/** Overshoot, so a piece lands with weight instead of gliding in. */
const EASE_SNAP = "cubic-bezier(.2,1.55,.3,1)";

/**
 * Blow the page apart.
 *
 * Portrait gets its own choreography: pieces collapse down the column and
 * recede from the camera rather than flying off the sides, which is the only
 * direction a phone has room for.
 */
export function scatter(pieces: Piece[], portrait: boolean) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  pieces.forEach((p, i) => {
    const r = p.el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const spin = ((i % 2 ? -1 : 1) * (3 + (i % 4) * 2.5)).toFixed(2);

    const t = portrait
      ? // Portrait has no room sideways: the column collapses straight down
        // and the pieces recede from the camera instead.
        `translate3d(0px, ${(dy * 0.62 + (i % 3) * 26).toFixed(1)}px, 0) scale(${(
          0.66 -
          (i % 3) * 0.05
        ).toFixed(2)}) rotate(${spin}deg)`
      : `translate3d(${(dx * 0.62).toFixed(1)}px, ${(dy * 0.5).toFixed(
          1
        )}px, 0) scale(${(0.74 - (i % 3) * 0.04).toFixed(2)}) rotate(${spin}deg)`;

    p.el.style.transition = `transform 620ms ${EASE_OUT} ${i * 34}ms, opacity 400ms linear`;
    p.el.style.transform = t;
    p.el.style.opacity = "0.85";
    p.el.style.willChange = "transform";
  });
}

/** Small idle drift while he stands there looking at the mess. */
export function drift(pieces: Piece[], portrait: boolean) {
  pieces.forEach((p, i) => {
    const base = p.el.style.transform;
    p.el.style.transition = `transform 1200ms ease-in-out`;
    p.el.style.transform = `${base} translate3d(0, ${
      (i % 2 ? -1 : 1) * (portrait ? 8 : 12)
    }px, 0)`;
  });
}

/** Snap one piece back into its real position. */
export function settle(p: Piece, delay: number) {
  p.el.style.transition = `transform 560ms ${EASE_SNAP} ${delay}ms, opacity 260ms linear ${delay}ms`;
  p.el.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
  p.el.style.opacity = "1";
}

/** Put every inline style back exactly as it was found. */
export function restore(pieces: Piece[]) {
  pieces.forEach((p) => {
    if (p.prevStyle) p.el.setAttribute("style", p.prevStyle);
    else p.el.removeAttribute("style");
  });
}
