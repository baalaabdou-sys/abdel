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
  },
  {
    slug: "attendance-app",
    title: "Attendance Management System",
    tagline: "Biometric attendance tracking with live schedules",
    description:
      "A PWA for staff attendance built on a FastAPI service layer that talks directly to ZKBioTime biometric devices. Handles per-employee schedules, offline-friendly sync, and push notifications for check-in events.",
    stack: ["React", "Vite", "TypeScript", "Zustand", "FastAPI", "SQL"],
    category: "Full-stack",
  },
  {
    slug: "photo-organizer",
    title: "Product Photo Organizer",
    tagline: "AI-sorted product photography, straight to Drive",
    description:
      "An Android app that lets a team pick photos from the gallery, classifies each one by category and brand with an AI vision model, and uploads them straight into matching nested folders in a shared Google Drive.",
    stack: ["React Native", "Expo", "Gemini API", "Google Drive API"],
    href: "https://github.com/baalaabdou-sys/Product-photo-organizer-",
    hrefLabel: "View source",
    category: "Mobile",
  },
  {
    slug: "whatsapp-sales-tracker",
    title: "WhatsApp Sales Tracker",
    tagline: "Turning WhatsApp orders into structured sales data",
    description:
      "A lightweight tracking tool that captures orders coming in through WhatsApp and organizes them into a running log — giving a small business owner real visibility into sales without changing how customers actually order.",
    stack: ["Automation", "Sales Ops"],
    category: "Business Tools",
  },
  {
    slug: "cuiressalam",
    title: "Cuiressalam.ma",
    tagline: "Business website for a leather goods brand",
    description:
      "A client website built to present and sell a leather goods catalogue online, with a clean product presentation and a focus on load speed and mobile browsing.",
    stack: ["Web", "E-commerce"],
    category: "Web",
  },
  {
    slug: "erp",
    title: "Internal ERP System",
    tagline: "Operations management for day-to-day business workflows",
    description:
      "A custom ERP built to centralize the operational side of a business — tracking inventory, orders, and internal workflows in one system instead of scattered spreadsheets.",
    stack: ["Full-stack", "Database Design"],
    category: "Full-stack",
  },
];
