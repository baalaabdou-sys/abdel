"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useSpring } from "framer-motion";

type Body = {
  el: HTMLElement;
  apply: (dx: number, dy: number, rot: number) => void;
};

type PhysicsValue = {
  register: (b: Body) => void;
  unregister: (b: Body) => void;
  /** Shove every nearby body away from this viewport point. */
  impulse: (x: number, y: number, strength?: number) => void;
};

const PhysicsContext = createContext<PhysicsValue | null>(null);

/** How far an impact is felt, in px. */
const REACH = 340;

export function PhysicsProvider({ children }: { children: React.ReactNode }) {
  const bodies = useRef(new Set<Body>()).current;

  const value = useRef<PhysicsValue>({
    register: (b) => bodies.add(b),
    unregister: (b) => bodies.delete(b),
    impulse: (x, y, strength = 60) => {
      bodies.forEach((b) => {
        const r = b.el.getBoundingClientRect();
        if (!r.width) return;
        const dx = r.left + r.width / 2 - x;
        const dy = r.top + r.height / 2 - y;
        const dist = Math.hypot(dx, dy);
        if (dist > REACH || dist === 0) return;
        // Falls off with distance, so a near miss nudges and a direct hit
        // properly shoves.
        const f = (1 - dist / REACH) ** 1.6 * strength;
        b.apply((dx / dist) * f, (dy / dist) * f, (dx / dist) * f * 0.4);
      });
    },
  }).current;

  return <PhysicsContext.Provider value={value}>{children}</PhysicsContext.Provider>;
}

export function usePhysics() {
  return useContext(PhysicsContext);
}

/**
 * Makes an element physical: it gets knocked when something is thrown near it
 * and springs back to rest. Spread `style` onto a motion element and attach
 * `ref` to it.
 */
export function usePhysicsBody() {
  const ctx = usePhysics();
  const ref = useRef<HTMLElement | null>(null);
  const x = useSpring(0, { stiffness: 190, damping: 11 });
  const y = useSpring(0, { stiffness: 190, damping: 11 });
  const rotate = useSpring(0, { stiffness: 190, damping: 11 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !ctx) return;
    const body: Body = {
      el,
      apply: (dx, dy, rot) => {
        x.set(dx);
        y.set(dy);
        rotate.set(rot);
        // Release almost immediately — the spring does the settling, which
        // is what makes it read as a knock rather than a slide.
        window.setTimeout(() => {
          x.set(0);
          y.set(0);
          rotate.set(0);
        }, 110);
      },
    };
    ctx.register(body);
    return () => ctx.unregister(body);
  }, [ctx, x, y, rotate]);

  return { ref, style: { x, y, rotate } };
}
