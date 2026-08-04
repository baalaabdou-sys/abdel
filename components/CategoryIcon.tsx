const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Bespoke per-category glyphs (not generic icon-library shapes) so each
// section reads as its own drink rather than a reused stock icon.
const paths: Record<string, React.ReactNode> = {
  // Espresso cup + saucer, steam
  cafeine: (
    <>
      <path d="M6 10h9v4.5a3.5 3.5 0 0 1-3.5 3.5h-2A3.5 3.5 0 0 1 6 14.5V10Z" />
      <path d="M15 11.2c1.4 0 2.3.9 2.3 2.1s-.9 2.1-2.3 2.1" />
      <ellipse cx="10.5" cy="19.3" rx="7" ry="1.3" />
      <path d="M8.5 6.5c0-.7.6-.9.6-1.6S8.5 3.7 8.5 3M11.8 6.5c0-.7.6-.9.6-1.6s-.6-1.2-.6-1.9" />
    </>
  ),
  // Tall glass with rosetta latte-art heart
  latte: (
    <>
      <path d="M7.5 5h9l-.9 12.2a2 2 0 0 1-2 1.8h-3.2a2 2 0 0 1-2-1.8L7.5 5Z" />
      <path d="M7.5 5h9" />
      <path d="M9.5 8.3c1.6-1 3.5-1 5 0" />
      <path d="M12 7.6v2.6" />
    </>
  ),
  // Tall Moroccan tea glass, wavy steam, single mint leaf
  "the-marocain": (
    <>
      <path d="M8 6h8l-.9 11.3a2 2 0 0 1-2 1.7h-2.2a2 2 0 0 1-2-1.7L8 6Z" />
      <path d="M8 6h8" />
      <path d="M10 3.4c.5.6.5 1.2 0 1.8M12.6 3.4c.5.6.5 1.2 0 1.8" />
      <path d="M14.2 8.6c1.3-.5 2.4.2 2.4 1.2 0 1-1.4 1.3-2.4.5.3-.9.3-1.2 0-1.7Z" />
    </>
  ),
  // Mug with a single rising swirl of chocolate
  "choco-milk": (
    <>
      <path d="M6 9h9v6.5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9Z" />
      <path d="M15 10c1.4 0 2.3.9 2.3 2s-.9 2-2.3 2" />
      <path d="M8.3 9c0-1.6.9-2.1.9-3.3S8.3 3.9 9.4 3" />
    </>
  ),
  // Iced glass with cubes
  ice: (
    <>
      <path d="M7 5h10l-1.1 12.4a2 2 0 0 1-2 1.8h-3.8a2 2 0 0 1-2-1.8L7 5Z" />
      <path d="M7 5h10" />
      <rect x="9.3" y="7.6" width="3" height="3" rx="0.4" transform="rotate(8 10.8 9.1)" />
      <rect x="12.6" y="9" width="2.6" height="2.6" rx="0.4" transform="rotate(-6 13.9 10.3)" />
    </>
  ),
  // Blended cup with whipped-cream peak and straw
  essfrapa: (
    <>
      <path d="M7.5 9h9l-.9 9a2 2 0 0 1-2 1.8h-3.2a2 2 0 0 1-2-1.8l-.9-9Z" />
      <path d="M9 9c.3-1.6 1.4-2.6 3-2.6s2.7 1 3 2.6" />
      <path d="M12.4 4.2 11.6 9" />
    </>
  ),
  // Glass with a citrus wedge
  limonades: (
    <>
      <path d="M7 5h10l-1.1 12.4a2 2 0 0 1-2 1.8h-3.8a2 2 0 0 1-2-1.8L7 5Z" />
      <path d="M7 5h10" />
      <path d="M12.5 6.8a3.4 3.4 0 0 1 3.4 3.4h-3.4Z" />
      <path d="M12.5 7.7v2.5h2.5" />
    </>
  ),
  // Tall iced tea glass, ice cube and a single mint leaf
  "thes-glaces": (
    <>
      <path d="M8 6h8l-.9 11.3a2 2 0 0 1-2 1.7h-2.2a2 2 0 0 1-2-1.7L8 6Z" />
      <path d="M8 6h8" />
      <path d="M13 7.4c1.7-.9 3.1 0 3.1 1.2s-1.6 1.6-3.1.6c.3-.9.3-1.1 0-1.8Z" />
      <rect x="9.6" y="9.6" width="2.8" height="2.8" rx="0.4" transform="rotate(8 11 11)" />
    </>
  ),
  // Milkshake glass with ribbed body, straw and cream swirl
  milkshakes: (
    <>
      <path d="M8 8h8l-.8 9.3a2 2 0 0 1-2 1.7h-2.4a2 2 0 0 1-2-1.7L8 8Z" />
      <path d="M8.6 5.2c1.2-1 2.4-1.4 3.4-1.4s2.2.4 3.4 1.4" />
      <path d="M9.4 8 8.6 5.2M14.6 8l.8-2.8" />
      <path d="M13.6 3 12.8 8" />
    </>
  ),
};

export default function CategoryIcon({
  categoryId,
  className,
}: {
  categoryId: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...commonProps}>
      {paths[categoryId] ?? paths.cafeine}
    </svg>
  );
}
