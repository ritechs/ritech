import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, LinkCard, PageBody, SectionNav } from "@/components/page/content";
import { eventsIntro, eventTypes } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Events", description: eventsIntro };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("event", designedMetadata);
}

export default async function EventsPage() {
  const edited = await getManagedPage("event");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Event" }]} aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/event" /><ContactCard heading="Event enquiries" /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Events" description={eventsIntro} crumbs={[{ label: "Home", href: "/" }, { label: "Event" }]} />
      <PageBody aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/event" /><ContactCard heading="Event enquiries" /></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {eventTypes.map((e) => (
            <LinkCard key={e.slug} href={e.href} title={e.title} text={e.summary} />
          ))}
          <LinkCard href="/conference" title="Conferences" text="International conferences hosted and co-organised by RiTECHS since 2021." />
        </div>
      </PageBody>
    </main>
  );
}
