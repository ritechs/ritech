import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionTitle } from "@/components/page/content";
import { ConferenceCard } from "@/components/conferences/conference-card";
import { getConferences } from "@/lib/server/content";
import { conferenceServices } from "@/lib/content/programmes";
import { getToday } from "@/lib/today";

export const metadata: Metadata = {
  title: "Conferences",
  description: "International conferences hosted and co-organised by RiTECHS since 2021, including the ITSS-IoE, ICETCS and AIoT-RSE series.",
};

export default async function ConferencesPage() {
  const today = await getToday();
  const conferences = await getConferences();
  const sorted = [...conferences].sort((a, b) => (b.startDate ?? "0").localeCompare(a.startDate ?? "0"));
  return (
    <main id="main" className="flex-1">
      <PageHeader
        title="Conferences"
        description={`${conferences.length} international conferences since 2021, across cybersecurity, the Internet of Everything, sustainable energy and digital business.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Conference" }]}
      />
      <div className="container-site py-12 md:py-16">
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <li key={c.slug}>
              <ConferenceCard conference={c} today={today} showPoster />
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-rule bg-paper">
        <PageBody
          aside={
            <ContactCard heading="Organise or sponsor a conference">
              To find out more about attending, organising, sponsoring or exhibiting at a conference, call or email us.
            </ContactCard>
          }
        >
          <SectionTitle>About RiTECHS Conferences</SectionTitle>
          <Prose paragraphs={[conferenceServices.intro]} className="mt-4" />
          <SectionTitle>Why Join a RiTECHS Conference?</SectionTitle>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {conferenceServices.whyJoin.map((r) => (
              <li key={r} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink/90">
                <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border border-rule bg-surface p-6">
              <h3 className="font-serif text-xl text-ink">Attend a Conference</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{conferenceServices.attend}</p>
            </section>
            <section className="rounded-lg border border-rule bg-surface p-6">
              <h3 className="font-serif text-xl text-ink">Plan a Conference With Us</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{conferenceServices.organise}</p>
            </section>
          </div>
        </PageBody>
      </div>
    </main>
  );
}
