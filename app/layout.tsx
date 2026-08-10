import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

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
      <body className="bg-ink font-body antialiased">{children}</body>
    </html>
  );
}
