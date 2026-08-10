/**
 * Real custom QR design work.
 *
 * TO ADD AN EXAMPLE:
 *   1. Drop the image into  public/qr-showcase/  (e.g. cafe-menu-poster.jpg)
 *   2. Set `image` below to  "/qr-showcase/cafe-menu-poster.jpg"
 *
 * Entries with `image: null` render as a styled "coming soon" tile, so the
 * gallery still looks intentional before any artwork is added.
 */
export type QrShowcaseItem = {
  slug: string;
  title: string;
  category: string;
  description: string;
  image: string | null;
};

export const QR_SHOWCASE: QrShowcaseItem[] = [
  {
    slug: "aurelia-coffee-house",
    title: "Aurelia Coffee House",
    category: "Hospitality",
    description:
      "A warm, hand-illustrated menu code for a coffee house — coffee-bean linework and the shop's own monogram carried straight through into the code itself.",
    image: "/qr-showcase/aurelia-coffee-house.jpg",
  },
  {
    slug: "miel-crumb-bakery",
    title: "Miel & Crumb Bakery",
    category: "Hospitality",
    description:
      "A bakery menu poster built around wheat sprigs, a honey dipper and the shop's badge — the code sits inside the illustration instead of next to it.",
    image: "/qr-showcase/miel-crumb-bakery.jpg",
  },
  {
    slug: "maison-olive",
    title: "Maison Olive",
    category: "Hospitality",
    description:
      "An editorial restaurant menu card in olive and gold, with the venue's monogram set into the centre of the code and its identity carried through every border detail.",
    image: "/qr-showcase/maison-olive.jpg",
  },
  {
    slug: "luna-harbor-hotel",
    title: "Luna Harbor Hotel",
    category: "Hospitality",
    description:
      "A guest-services and Wi-Fi card for a five-star hotel — deep navy and gold, art-deco detailing, designed to sit on a nightstand and feel like part of the room.",
    image: "/qr-showcase/luna-harbor-hotel.jpg",
  },
  {
    slug: "instagram-standee",
    title: "Instagram Follow Standee",
    category: "Social",
    description:
      "A counter-top piece built to convert foot traffic into followers — handle, call to action and code composed as one graphic in the brand's social styling.",
    image: null,
  },
  {
    slug: "noir-atelier",
    title: "Noir Atelier",
    category: "Retail",
    description:
      "A fashion boutique's shop-the-collection code, styled in black and gold art-deco linework to match the label's own packaging and in-store signage.",
    image: "/qr-showcase/noir-atelier.jpg",
  },
  {
    slug: "voyage-expo",
    title: "Voyage Expo 2027",
    category: "Events",
    description:
      "An event pass poster themed entirely around travel — vintage stamps, a compass rose worked into the code's centre, and a skyline running along the base.",
    image: "/qr-showcase/voyage-expo.jpg",
  },
  {
    slug: "veloura-beauty-lounge",
    title: "Veloura Beauty Lounge",
    category: "Business",
    description:
      "A booking code for a beauty lounge, dressed in blush and gold with the brand's emblem set at the centre — designed to book an appointment, not just scan.",
    image: "/qr-showcase/veloura-beauty-lounge.jpg",
  },
  {
    slug: "serenite-spa",
    title: "Sérénité Spa",
    category: "Business",
    description:
      "A treatment-booking code in soft sage and gold, framed by botanical linework so it reads as part of the spa's own calm, editorial identity.",
    image: "/qr-showcase/serenite-spa.jpg",
  },
  {
    slug: "northline-hub",
    title: "Northline Hub",
    category: "Business",
    description:
      "A membership sign-up code for a co-working space — architectural line art, a copper accent, and the code framed like a keycard rather than a sticker.",
    image: "/qr-showcase/northline-hub.jpg",
  },
  {
    slug: "pixel-forge-studio",
    title: "Pixel Forge Studio",
    category: "Business",
    description:
      "A portfolio code for a digital studio, built entirely in their own neon HUD visual language — proof the same technique scales from soft and organic to sharp and technical.",
    image: "/qr-showcase/pixel-forge-studio.jpg",
  },
  {
    slug: "business-card",
    title: "Business Card with QR",
    category: "Identity",
    description:
      "Contact card where the code is integrated into the card's composition rather than dropped into a corner — saving the full contact record in one scan.",
    image: null,
  },
];
