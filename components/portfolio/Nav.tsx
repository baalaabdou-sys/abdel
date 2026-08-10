"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#work", label: "Work" },
  { href: "#skills", label: "Skills" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState("#top");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links
      .map((l) => document.querySelector(l.href))
      .filter((el): el is Element => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHref(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-ink/80 backdrop-blur-lg border-b border-ink-line" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="#top" className="font-display text-lg tracking-tight text-paper" data-cursor-hover>
          Abderrahmane<span className="text-accent">.</span>
        </a>
        <div className="hidden gap-8 sm:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-cursor-hover
              className={`text-sm transition ${
                activeHref === l.href ? "text-accent" : "text-haze hover:text-paper"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#contact"
          data-cursor-hover
          className="rounded-full border border-ink-line px-4 py-2 text-xs font-medium text-paper transition hover:border-accent hover:text-accent"
        >
          Let's talk
        </a>
      </nav>
    </header>
  );
}
