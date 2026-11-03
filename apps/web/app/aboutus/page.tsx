import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, Prose, SectionNav, LinkCard } from "@/components/page/content";
import { about, missionVision } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "About", description: about.paragraphs[0].slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("aboutus", designedMetadata);
}

export default async function AboutPage() {
  const edited = await getManagedPage("aboutus");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/aboutus" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title={about.title} crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/aboutus" />}>
        <Prose paragraphs={about.paragraphs} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <LinkCard href="/mission" title="Our Mission" text={missionVision.mission} />
          <LinkCard href="/mission" title="Our Vision" text={missionVision.vision} />
        </div>
      </PageBody>
    </main>
  );
}
