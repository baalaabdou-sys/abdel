"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const HERO_IMAGE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_092809_890a4dde-893b-44af-bd6f-45fccee044fd.png";

export default function Hero() {
  const [imageOk, setImageOk] = useState(true);

  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1440] via-ink to-ink">
        {imageOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={HERO_IMAGE}
            alt=""
            onError={() => setImageOk(false)}
            className="h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft/60 px-4 py-1.5 text-xs font-medium tracking-wide text-accent-soft"
        >
          Full-Stack &amp; Software Developer
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-paper sm:text-6xl md:text-7xl"
        >
          Abderrahmane Baalla
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-haze"
        >
          I build web apps, backends, and mobile tools that solve real
          problems — from digital menus and AI-sorted photo pipelines to
          biometric attendance systems and internal business software.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a
            href="#work"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
          >
            See my work
          </a>
          <a
            href="#contact"
            className="rounded-full border border-ink-line px-6 py-3 text-sm font-semibold text-paper transition hover:border-accent hover:text-accent"
          >
            Get in touch
          </a>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-haze/60">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="h-9 w-5 rounded-full border border-ink-line"
        >
          <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-accent-soft" />
        </motion.div>
      </div>
    </section>
  );
}
