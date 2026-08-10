import type { ClipKey } from "@/components/portfolio/avatar/clips";

export type BuildKind = "website" | "app";

export type BuildCategory = {
  slug: string;
  label: string;
  blurb: string;
};

export const KINDS: { kind: BuildKind; label: string; hint: string; clip: ClipKey }[] = [
  {
    kind: "website",
    label: "A Website",
    hint: "Something people visit, browse and trust",
    clip: "build_website",
  },
  {
    kind: "app",
    label: "An App",
    hint: "Something people open every day",
    clip: "build_app",
  },
];

export const CATEGORIES: Record<BuildKind, BuildCategory[]> = {
  website: [
    { slug: "portfolio", label: "Portfolio", blurb: "Your work, presented like it matters." },
    { slug: "business", label: "Business Website", blurb: "Clear, credible, built to convert." },
    { slug: "ecommerce", label: "E-commerce", blurb: "A storefront that actually sells." },
    { slug: "dashboard", label: "Dashboard", blurb: "Your data, finally readable." },
  ],
  app: [
    { slug: "finance", label: "Finance App", blurb: "Money in, money out — at a glance." },
    { slug: "delivery", label: "Delivery App", blurb: "Order, track, deliver. No friction." },
    { slug: "social", label: "Social App", blurb: "Built for people who keep coming back." },
    { slug: "admin", label: "Admin Tool", blurb: "The control room for your operation." },
  ],
};

export function getCategory(kind: BuildKind, slug: string) {
  return CATEGORIES[kind].find((c) => c.slug === slug);
}
