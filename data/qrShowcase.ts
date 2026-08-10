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
    slug: "cafe-menu-poster",
    title: "Café Menu Poster",
    category: "Hospitality",
    description:
      "A table-top poster where the code sits inside the café's own branding — logo, typography and palette carried through, so it reads as part of the venue rather than a sticker slapped on the table.",
    image: null,
  },
  {
    slug: "restaurant-menu",
    title: "Restaurant QR Menu",
    category: "Hospitality",
    description:
      "Menu access designed into the table setting: a framed code with illustrated detailing, matched to the restaurant's identity and printed at a size that scans comfortably from a seated position.",
    image: null,
  },
  {
    slug: "wifi-card",
    title: "Wi-Fi Guest Card",
    category: "Hospitality",
    description:
      "A small branded card guests actually keep on the table. Network name and code laid out with the venue's type and colours, no password typing required.",
    image: null,
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
    slug: "business-card",
    title: "Business Card with QR",
    category: "Identity",
    description:
      "Contact card where the code is integrated into the card's composition rather than dropped into a corner — saving the full contact record in one scan.",
    image: null,
  },
  {
    slug: "event-poster",
    title: "Event QR Poster",
    category: "Events",
    description:
      "Event artwork with the code worked into the illustration and themed to the occasion, sending scanners straight to tickets or the calendar entry.",
    image: null,
  },
  {
    slug: "booking-layout",
    title: "Branded Booking / Payment QR",
    category: "Business",
    description:
      "Signage for bookings or payment, composed for its real placement — counter, window or wall — with the contrast and sizing tuned for the distance it gets scanned from.",
    image: null,
  },
];
