import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import "./globals.css";
import { auth } from "@/lib/auth";
import { getLocale, getDictionary } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { getCompanyInfo } from "@/lib/settings";
import { Header, type HeaderUser } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { env } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "VIP Drivers — Chauffeur privé de prestige à Bruxelles",
    template: "%s · VIP Drivers",
  },
  description:
    "Transport privé haut de gamme à Bruxelles. Flotte Mercedes-Benz 2026, transferts et mises à disposition avec chauffeur. Prix ferme calculé en temps réel.",
  applicationName: "VIP Drivers",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VIP Drivers",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "VIP Drivers",
    title: "VIP Drivers — Chauffeur privé de prestige à Bruxelles",
    description:
      "Flotte Mercedes-Benz 2026, chauffeurs professionnels, prix ferme annoncé avant réservation.",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, locale, company] = await Promise.all([auth(), getLocale(), getCompanyInfo()]);
  const dictionary = getDictionary(locale);

  const user: HeaderUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role,
      }
    : null;

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh antialiased">
        <SessionProvider session={session}>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-ink-950"
            >
              {locale === "fr" ? "Aller au contenu" : "Skip to content"}
            </a>
            <ServiceWorkerRegistrar />
            <Header user={user} />
            <main id="main" className="pt-20">
              {children}
            </main>
            <Footer t={dictionary} locale={locale} company={company} />
            <Toaster
              theme="dark"
              position="top-center"
              toastOptions={{
                style: {
                  background: "#101013",
                  border: "1px solid #2a2a31",
                  color: "#e4e4e7",
                },
              }}
            />
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
