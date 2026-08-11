"use client";

import { useAvatarAnchor, useAvatarContext } from "./avatar/AvatarContext";
import MagneticButton from "./MagneticButton";

export default function Contact() {
  const { play } = useAvatarContext();
  const anchorRef = useAvatarAnchor("contact", { basePose: "idle", size: 440 });

  const handleClick = () => {
    play("celebrating", { force: true });
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-ink px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex justify-center lg:order-2">
          <div ref={anchorRef} className="h-72 w-56" />
        </div>

        <div
          className="text-center lg:order-1 lg:text-left"
          data-rb-scatter
          data-rb-tag="<Contact />"
          data-rb-order="60"
        >
          <p className="text-sm font-medium tracking-wide text-accent">Contact</p>
          <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
            Let's build something.
          </h2>
          <p className="mt-4 text-haze">
            Whether it's a website, an internal tool, or something that needs
            an app and a backend working together — I'd like to hear about it.
          </p>
          <MagneticButton
            href="mailto:baalaabdou@gmail.com"
            onClick={handleClick}
            className="mt-8 inline-flex rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-soft"
          >
            baalaabdou@gmail.com
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
