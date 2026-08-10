export default function Footer() {
  return (
    <footer className="border-t border-ink-line bg-ink px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-haze sm:flex-row">
        <p>© {new Date().getFullYear()} Abderrahmane Baalla</p>
        <p>Built with Next.js &amp; Tailwind CSS</p>
      </div>
    </footer>
  );
}
