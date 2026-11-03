import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav } from "@/components/page/content";
import { missionVision } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Mission & Vision", description: missionVision.mission };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("mission", designedMetadata);
}

export default async function MissionPage() {
  const edited = await getManagedPage("mission");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Mission & Vision" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/mission" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Mission & Vision" crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Mission & Vision" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/mission" />}>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { h: "Our Mission", t: missionVision.mission },
            { h: "Our Vision", t: missionVision.vision },
          ].map((b) => (
            <section key={b.h} className="rounded-lg border-t-2 border-brand bg-paper p-7">
              <h2 className="font-serif text-h3 text-ink">{b.h}</h2>
              <p className="mt-4 font-serif text-xl leading-relaxed text-ink/90">{b.t}</p>
            </section>
          ))}
        </div>
      </PageBody>
    </main>
  );
}
