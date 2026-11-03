import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { EventList } from "@/components/events/event-list";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, SectionNav, SectionTitle, TitledGrid } from "@/components/page/content";
import { seminar } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Seminar", description: seminar.intro.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("seminar", designedMetadata);
}

export default async function SeminarPage() {
  const edited = await getManagedPage("seminar");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Seminar" }]} aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/seminar" /><ContactCard heading="Seminar enquiries" person="Dr. Nadia Refat" /></>} after={<><SectionTitle>List of Seminars</SectionTitle><EventList type="seminar" empty="No seminars are scheduled at the moment. New dates are announced here and in the newsletter." /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Seminar" description={seminar.intro} crumbs={[{ label: "Home", href: "/" }, { label: "Event", href: "/event" }, { label: "Seminar" }]} />
      <PageBody aside={<><SectionNav title="Event" links={sectionLinks("Event")} current="/seminar" /><ContactCard heading="Seminar enquiries" person="Dr. Nadia Refat" /></>}>
        <TitledGrid items={seminar.purposes} />
        <SectionTitle>List of Seminars</SectionTitle>
        <EventList type="seminar" empty="No seminars are scheduled at the moment. New dates are announced here and in the newsletter." />
      </PageBody>
    </main>
  );
}
