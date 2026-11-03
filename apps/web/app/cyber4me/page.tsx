import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { EventList } from "@/components/events/event-list";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionNav, SectionTitle, BulletList } from "@/components/page/content";
import { cyber4me } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Cyber4Me", description: cyber4me.intro[0] };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("cyber4me", designedMetadata);
}

export default async function Cyber4mePage() {
  const edited = await getManagedPage("cyber4me");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Cyber4Me" }]} aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/cyber4me" /><ContactCard heading="Cyber4Me enquiries" /></>} after={<><SectionTitle>Activities</SectionTitle><EventList type="cyber4me" empty="No Cyber4Me activities are scheduled at the moment." /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Cyber4Me" description={cyber4me.intro[0]} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Cyber4Me" }]} />
      <PageBody aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/cyber4me" /><ContactCard heading="Cyber4Me enquiries" /></>}>
        <Prose paragraphs={[cyber4me.intro[1]]} />
        <SectionTitle>Activities</SectionTitle>
        <EventList type="cyber4me" empty="No Cyber4Me activities are scheduled at the moment." />
        <Prose paragraphs={[cyber4me.closing]} className="mt-10" />
        <SectionTitle>Sponsors</SectionTitle>
        <BulletList items={cyber4me.sponsors} />
      </PageBody>
    </main>
  );
}
