export type Project = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  stack: string[];
  href?: string;
  hrefLabel?: string;
  internal?: boolean;
  category: string;
  /**
   * Card artwork, in `public/projects/`. Deliberately a mood piece rather
   * than a screenshot: a UI shrunk to card width reads as noise, and half of
   * this work has no interface to photograph. Cards without one fall back to
   * the plain layout, so this can be added a project at a time.
   */
  image?: string;
};

export const projects: Project[] = [
  {
    slug: "cafe-al-fadili",
    title: "الفاضلي — Digital Menu",
    tagline: "Full digital menu experience for a café",
    description:
      "A fast, bilingual digital menu built for a café: category-based browsing, product photography, a click-to-enlarge viewer, and a time-aware animated hero — all running on a single lightweight page.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    href: "/projects/cafe",
    hrefLabel: "View case study",
    internal: true,
    category: "Web",
    image: "/projects/cafe-al-fadili.webp",
  },
  {
    slug: "manhwa-tracker",
    title: "Manhwa Tracker",
    tagline: "Scraper + notification engine for manhwa releases",
    description:
      "A FastAPI backend that searches and scrapes manhwa sources, tracks a user's favorites, polls for new chapters every 15 minutes, and pushes Web Push notifications the moment a new chapter drops.",
    stack: ["Python", "FastAPI", "BeautifulSoup", "Web Push", "VAPID"],
    href: "https://github.com/baalaabdou-sys/manhwa-tracker-backend",
    hrefLabel: "View source",
    category: "Backend",
    image: "/projects/manhwa-tracker.webp",
  },
  {
    slug: "attendance-app",
    title: "Attendance Management System",
    tagline: "Biometric attendance tracking with live schedules",
    description:
      "A PWA for staff attendance built on a FastAPI service layer that talks directly to ZKBioTime biometric devices. Handles per-employee schedules, offline-friendly sync, and push notifications for check-in events.",
    stack: ["React", "Vite", "TypeScript", "Zustand", "FastAPI", "SQL"],
    category: "Full-stack",
    image: "/projects/attendance-app.webp",
  },
  {
    slug: "whatsapp-sales-tracker",
    title: "WhatsApp Sales Tracker",
    tagline: "Turning raw seller chats into a same-day sales report",
    description:
      "A store runs sales through multiple WhatsApp seller groups, where each seller just types a product and a price in whatever currency they're used to — dh, dollars, euros. This tool reads every message, uses Gemini to pull the seller name and identify the exact product with 100% accuracy, and converts the price to dirhams at the live exchange rate at the moment of the sale. At the end of the day, it compiles everything into a report and sends it straight to the boss's WhatsApp automatically — no manual bookkeeping.",
    stack: ["Gemini API", "WhatsApp API", "Automation", "Live FX Rates"],
    category: "Business Tools",
    image: "/projects/whatsapp-sales-tracker.webp",
  },
  {
    slug: "cuiressalam",
    title: "Cuiressalam.ma",
    tagline: "Business website for a leather goods brand",
    description:
      "A client website built to present and sell a leather goods catalogue online, with a clean product presentation and a focus on load speed and mobile browsing.",
    stack: ["Web", "E-commerce"],
    category: "Web",
    image: "/projects/cuiressalam.webp",
  },
  {
    slug: "custom-qr-codes",
    title: "Custom Branded QR Codes",
    tagline: "Designed QR codes that still scan perfectly",
    description:
      "On-brand QR codes designed around a business's colors, logo, and shapes — not the default black-and-white grid — while keeping error-correction and contrast tuned so they scan reliably every time.",
    stack: ["Design", "Branding"],
    category: "Design",
    image: "/projects/custom-qr-codes.webp",
  },
  {
    slug: "erp",
    title: "Internal ERP System",
    tagline: "Operations management for day-to-day business workflows",
    description:
      "A custom ERP built to centralize the operational side of a business — tracking inventory, orders, and internal workflows in one system instead of scattered spreadsheets.",
    stack: ["Full-stack", "Database Design"],
    category: "Full-stack",
    image: "/projects/erp.webp",
  },
];
