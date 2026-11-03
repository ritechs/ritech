import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionNav, SectionTitle } from "@/components/page/content";
import { EventList } from "@/components/events/event-list";
import { bootcamp } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Boot Camp", description: bootcamp.paragraphs[0].slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("botcamp", designedMetadata);
}

export default async function BootcampPage() {
  const edited = await getManagedPage("botcamp");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Boot Camp" }]} aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/botcamp" /><ContactCard heading="Boot camp enquiries" person="Nafees Zaman" /></>} after={<><SectionTitle>Boot Camps</SectionTitle><EventList type="bootcamp" empty="No boot camps are scheduled at the moment. Contact us to hear about the next one." /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Boot Camp" crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Boot Camp" }]} />
      <PageBody aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/botcamp" /><ContactCard heading="Boot camp enquiries" person="Nafees Zaman" /></>}>
        <Prose paragraphs={bootcamp.paragraphs} />
        <SectionTitle>Boot Camps</SectionTitle>
        <EventList type="bootcamp" empty="No boot camps are scheduled at the moment. Contact us to hear about the next one." />
      </PageBody>
    </main>
  );
}
