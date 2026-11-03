import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { BulletList, ContactCard, PageBody, SectionNav, SectionTitle } from "@/components/page/content";
import { EventList } from "@/components/events/event-list";
import { researchAdda } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Research Adda", description: researchAdda.intro };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("research-adda", designedMetadata);
}

export default async function ResearchAddaPage() {
  const edited = await getManagedPage("research-adda");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Research Adda" }]} aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/research-adda" /><ContactCard heading="Research Adda enquiries" person="Dr. S M Nazmus Sadat" /></>} after={<><SectionTitle>Sessions</SectionTitle><EventList type="research-adda" empty="No Research Adda sessions are scheduled at the moment. Contact us to hear about the next one." /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Research Adda" description={researchAdda.intro} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Research Adda" }]} />
      <PageBody aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/research-adda" /><ContactCard heading="Research Adda enquiries" person="Dr. S M Nazmus Sadat" /></>}>
        <SectionTitle className="mt-0">Benefits of Participating</SectionTitle>
        <BulletList items={researchAdda.benefits} />
        <SectionTitle>Sessions</SectionTitle>
        <EventList type="research-adda" empty="No Research Adda sessions are scheduled at the moment. Contact us to hear about the next one." />
      </PageBody>
    </main>
  );
}
