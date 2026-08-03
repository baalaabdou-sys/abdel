import Image from "next/image";
import { Instagram, Facebook, MapPin, Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-border bg-coffee/5 py-14">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <Image
          src="/logo/logo.png"
          alt="Logo du café الفاضلي"
          width={72}
          height={72}
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        />

        <p className="font-display text-xl font-semibold leading-relaxed text-espresso sm:text-2xl">
          Préparé avec passion,
          <br />
          servi avec amour.
        </p>

        <span className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-medium text-gold-dark">
          Sur place uniquement
        </span>

        <div className="flex items-center gap-2 text-sm text-muted">
          <Clock className="h-4 w-4 text-gold-dark" />
          <span>Tous les jours — 08:00 à 23:00</span>
        </div>

        <div id="notre-cafe" className="flex items-center gap-2 text-sm text-muted">
          <MapPin className="h-4 w-4 text-gold-dark" />
          <span>Emplacement à venir</span>
        </div>

        <div id="galerie" className="flex items-center gap-4 pt-2">
          <span
            aria-label="Instagram (à venir)"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-coffee"
          >
            <Instagram className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <span
            aria-label="Facebook (à venir)"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-coffee"
          >
            <Facebook className="h-5 w-5" strokeWidth={1.6} />
          </span>
        </div>

        <p className="pt-4 text-xs text-muted">
          © {new Date().getFullYear()} الفاضلي — كوفي · مطعم
        </p>
      </div>
    </footer>
  );
}
