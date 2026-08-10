import type { QrPurpose } from "@/lib/qr";

export type QrField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "tel" | "email" | "date" | "password" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  full?: boolean;
};

export type QrPurposeDef = {
  purpose: QrPurpose;
  label: string;
  blurb: string;
  fields: QrField[];
};

export const QR_PURPOSES: QrPurposeDef[] = [
  {
    purpose: "link",
    label: "Website / Link",
    blurb: "Send people straight to any page.",
    fields: [
      { name: "url", label: "Link", placeholder: "yoursite.com", type: "url", required: true, full: true },
    ],
  },
  {
    purpose: "menu",
    label: "Restaurant Menu",
    blurb: "A menu on every table, no app needed.",
    fields: [
      { name: "url", label: "Menu link", placeholder: "yourcafe.com/menu", type: "url", required: true, full: true },
    ],
  },
  {
    purpose: "wifi",
    label: "Wi-Fi",
    blurb: "Guests connect without typing a password.",
    fields: [
      { name: "ssid", label: "Network name", placeholder: "Cafe_Guest", required: true },
      {
        name: "encryption",
        label: "Security",
        type: "select",
        options: [
          { value: "WPA", label: "WPA / WPA2" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "Open (no password)" },
        ],
      },
      { name: "password", label: "Password", placeholder: "••••••••", type: "password", full: true },
    ],
  },
  {
    purpose: "social",
    label: "Instagram / Social",
    blurb: "Turn foot traffic into followers.",
    fields: [
      {
        name: "network",
        label: "Platform",
        type: "select",
        options: [
          { value: "instagram", label: "Instagram" },
          { value: "tiktok", label: "TikTok" },
          { value: "facebook", label: "Facebook" },
          { value: "x", label: "X" },
          { value: "linkedin", label: "LinkedIn" },
        ],
      },
      { name: "handle", label: "Handle", placeholder: "@yourbrand", required: true },
    ],
  },
  {
    purpose: "whatsapp",
    label: "WhatsApp",
    blurb: "One scan opens a chat with you.",
    fields: [
      { name: "phone", label: "Number (with country code)", placeholder: "212600000000", type: "tel", required: true },
      { name: "message", label: "Prefilled message", placeholder: "Hi! I'd like to order…" },
    ],
  },
  {
    purpose: "contact",
    label: "Contact Card",
    blurb: "Saved to their phone in one scan.",
    fields: [
      { name: "name", label: "Full name", placeholder: "Abderrahmane Baalla", required: true },
      { name: "org", label: "Company", placeholder: "Your business" },
      { name: "phone", label: "Phone", placeholder: "+212 6 00 00 00 00", type: "tel" },
      { name: "email", label: "Email", placeholder: "you@business.com", type: "email" },
    ],
  },
  {
    purpose: "event",
    label: "Event",
    blurb: "Straight into their calendar.",
    fields: [
      { name: "title", label: "Event name", placeholder: "Grand opening", required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "location", label: "Location", placeholder: "Casablanca", full: true },
    ],
  },
];

export function getPurposeDef(p: QrPurpose) {
  return QR_PURPOSES.find((d) => d.purpose === p)!;
}
