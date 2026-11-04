import { Suspense } from "react";
import { HideOnAdmin } from "@/components/layout/hide-on-admin";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { siteConfig } from "@/lib/site";
import "./globals.css";

/*
 * Fonts are self-hosted (next/font/local) so builds don't depend on
 * reaching Google Fonts and no layout shift occurs on load.
 *  - Newsreader: editorial serif for headings, article titles, abstracts
 *  - IBM Plex Sans: interface text and metadata
 *  - IBM Plex Mono: identifiers only (DOI, ISSN)
 *  - Oswald: condensed uppercase headings on the home page
 */
const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-opsz-normal.woff2", style: "normal", weight: "200 800" },
    { path: "./fonts/newsreader-latin-opsz-italic.woff2", style: "italic", weight: "200 800" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const oswald = localFont({
  src: [
    { path: "./fonts/oswald-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/oswald-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/oswald-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-oswald",
  display: "swap",
});

const plexMono = localFont({
  src: "./fonts/ibm-plex-mono-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.shortName} — ${siteConfig.name}`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  keywords: [
    "research publication",
    "academic journals",
    "peer review",
    "conferences",
    "research community",
    "RiTECHS",
  ],
  openGraph: {
    type: "website",
    siteName: siteConfig.shortName,
    title: `${siteConfig.shortName} — ${siteConfig.name}`,
    description: siteConfig.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} — ${siteConfig.name}`,
    description: siteConfig.description,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1f2933",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} ${oswald.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Suspense>
          <HideOnAdmin>
            <SiteHeader />
          </HideOnAdmin>
        </Suspense>
        {children}
        <Suspense>
          <HideOnAdmin>
            <SiteFooter />
          </HideOnAdmin>
        </Suspense>
      </body>
    </html>
  );
}
