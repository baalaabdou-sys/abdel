export default function Contact() {
  return (
    <section id="contact" className="bg-ink px-6 py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium tracking-wide text-accent">Contact</p>
        <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
          Have a project in mind?
        </h2>
        <p className="mt-4 text-haze">
          Whether it's a website, an internal tool, or something that needs
          an app and a backend working together — I'd like to hear about it.
        </p>
        <a
          href="mailto:baalaabdou@gmail.com"
          className="mt-8 inline-flex rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-soft"
        >
          baalaabdou@gmail.com
        </a>
      </div>
    </section>
  );
}
