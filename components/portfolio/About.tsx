const stack = [
  "TypeScript",
  "React / Next.js",
  "React Native / Expo",
  "Python / FastAPI",
  "SQL",
  "Tailwind CSS",
  "REST APIs",
  "Push Notifications",
];

export default function About() {
  return (
    <section id="about" className="border-t border-ink-line bg-ink-soft px-6 py-28">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.1fr_0.9fr]">
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
              classification, scraping pipelines, whatever the problem
              actually needs.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium tracking-wide text-accent">Toolbox</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-ink-line bg-ink px-4 py-2 text-sm text-paper"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
