"use client";

import { useAvatarAnchor } from "./avatar/AvatarContext";

const pillars = [
  { label: "Coding", detail: "Clean, typed, maintainable" },
  { label: "AI", detail: "Gemini-powered automation" },
  { label: "Design", detail: "Interfaces people enjoy" },
  { label: "Product", detail: "Owning it end to end" },
];

export default function About() {
  const anchorRef = useAvatarAnchor("about", { basePose: "sit_lean", size: 200 });

  return (
    <section id="about" className="relative overflow-hidden border-t border-ink-line bg-ink-soft px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative flex justify-center">
          <div className="relative w-full max-w-sm rounded-3xl border border-ink-line bg-ink/70 p-6 pt-16 shadow-soft">
            <div ref={anchorRef} className="absolute -top-16 left-1/2 h-40 w-32 -translate-x-1/2" />

            <div className="grid grid-cols-2 gap-3 pt-4">
              {pillars.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border border-ink-line bg-ink-soft/60 px-3 py-3 text-center"
                >
                  <p className="text-sm font-semibold text-paper">{p.label}</p>
                  <p className="mt-1 text-[11px] text-haze">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium tracking-wide text-accent">About</p>
          <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
            I turn messy workflows into working software.
          </h2>
          <div className="mt-6 space-y-4 text-haze">
            <p>
              I'm Abderrahmane, a full-stack and software developer. I like
              projects that start as a real, specific problem — a café that
              needs a menu, a shop that needs its WhatsApp orders organized,
              a business drowning in spreadsheets — and end as a piece of
              software that just works.
            </p>
            <p>
              That usually means owning the whole thing: the frontend people
              touch, the backend that keeps it honest, and the integrations
              in between — biometric devices, push notifications, AI
              classification, live currency conversion, whatever the problem
              actually needs.
            </p>
            <p>
              I don't just write code — I build ideas into products.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
