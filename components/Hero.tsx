import { Coffee } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div className="space-y-6 text-center lg:text-right">
          <span className="inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark">
            Sur place uniquement
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight text-espresso sm:text-4xl lg:text-5xl">
            Découvrez notre
            <br />
            carte des boissons
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-muted lg:mx-0">
            Des boissons préparées avec passion, pour des moments
            inoubliables.
          </p>
        </div>

        <div className="relative mx-auto flex h-64 w-full max-w-sm items-center justify-center sm:h-80">
          <div
            className="absolute inset-0 rounded-xl2"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(197,144,45,0.18), transparent 60%)",
            }}
          />
          <div className="relative flex h-56 w-40 flex-col items-center justify-end overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-espresso/10 bg-gradient-to-b from-white/40 to-white/10 shadow-soft sm:h-72 sm:w-48">
            <div
              className="h-3/5 w-full"
              style={{
                background:
                  "linear-gradient(180deg, #4A2E1C 0%, #2B1B13 100%)",
              }}
            />
            <div className="absolute inset-x-3 top-6 h-8 rounded-md bg-white/25 blur-sm" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-3 w-3 rounded-full bg-white/50"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${30 + (i % 3) * 12}%`,
                }}
              />
            ))}
          </div>
          <Coffee className="absolute -bottom-2 -left-2 h-16 w-16 rotate-[-12deg] text-coffee/30 sm:h-20 sm:w-20" strokeWidth={1.2} />
        </div>
      </div>
    </section>
  );
}
