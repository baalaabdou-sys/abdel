"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#menu", label: "Menu" },
  { href: "#notre-cafe", label: "Notre café" },
  { href: "#galerie", label: "Galerie" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo/logo.png"
            alt="Logo du café الفاضلي"
            width={44}
            height={44}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            priority
          />
          <div className="hidden flex-col sm:flex">
            <span className="font-display text-lg font-semibold text-espresso">
              الفاضلي
            </span>
            <span className="text-[11px] tracking-wide text-muted">
              كوفي · مطعم
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-coffee transition-colors hover:text-gold-dark"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark sm:inline-block">
            Sur place uniquement
          </span>
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-border p-2 text-espresso md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium text-coffee"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <span className="mt-3 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark">
            Sur place uniquement
          </span>
        </nav>
      )}
    </header>
  );
}
