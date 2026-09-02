import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import { PwaRegister } from '@/components/layout/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ASSURLEAD AI', template: '%s · ASSURLEAD AI' },
  description: 'Plateforme de génération de leads assurance : base de contacts, campagnes, landing pages, leads qualifiés et CRM.',
  applicationName: 'ASSURLEAD AI',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ASSURLEAD AI', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <PwaRegister />
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
