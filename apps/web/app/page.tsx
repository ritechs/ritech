import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { ImpactStats } from "@/components/home/impact-stats";
import { FeaturedResearch } from "@/components/home/featured-research";
import { ResearchAreas } from "@/components/home/research-areas";
import { EventsSection } from "@/components/home/events-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { MentorshipSection } from "@/components/home/mentorship-section";
import { ServicesSection } from "@/components/home/services-section";
import { NewsSection } from "@/components/home/news-section";
import { PartnersSection } from "@/components/home/partners-section";
import { NewsletterCta } from "@/components/home/newsletter-cta";
import { contact } from "@/lib/data/contact";
import { getFeaturedConference } from "@/lib/server/content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.shortName} | Research, Innovation, Technology & Solution` },
  description:
    "RiTECHS connects researchers, scholars and innovators through publications, international conferences, mentorship and research training.",
};

const jsonLdFor = (featuredConference: Awaited<ReturnType<typeof getFeaturedConference>>) => [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.shortName,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo.onLight}`,
    email: contact.email,
    telephone: contact.phone.display,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address[0],
      addressLocality: "Wolverhampton",
      addressRegion: "West Midlands",
      postalCode: "WV6 0NG",
      addressCountry: "GB",
    },
  },
  ...(featuredConference
    ? [
        {
          "@context": "https://schema.org",
          "@type": "Event",
          name: `${featuredConference.title} (${featuredConference.shortTitle})`,
          startDate: featuredConference.startsAt,
          endDate: featuredConference.endsAt,
          eventAttendanceMode: featuredConference.mode === "Hybrid" ? "https://schema.org/MixedEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
          ...(featuredConference.location ? { location: { "@type": "Place", name: featuredConference.location } } : {}),
          url: `${siteConfig.url}/conferences/${featuredConference.slug}`,
          organizer: { "@type": "Organization", name: siteConfig.shortName, url: siteConfig.url },
        },
      ]
    : []),
];

export default async function HomePage() {
  const jsonLd = jsonLdFor(await getFeaturedConference());
  return (
    <main id="main" className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <ImpactStats />
      <FeaturedResearch />
      <ResearchAreas />
      <EventsSection />
      <HowItWorks />
      <MentorshipSection />
      <ServicesSection />
      <NewsSection />
      <PartnersSection />
      <NewsletterCta />
    </main>
  );
}
