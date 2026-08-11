import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { INTRO_PRELOAD } from "@/components/portfolio/intro/preload";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Abderrahmane Baalla — Full-Stack & Software Developer",
  description:
    "Portfolio of Abderrahmane Baalla: web apps, backends, and mobile tools — digital menus, AI photo pipelines, attendance systems, and business software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* The entrance shot starts fetching with the document, so the
            portal is not preceded by a spinner. */}
        <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" />
        <link
          rel="preload"
          as="video"
          type="video/mp4"
          href={INTRO_PRELOAD}
        />
      </head>
      <body className="bg-ink font-body antialiased">{children}</body>
    </html>
  );
}
