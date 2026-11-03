import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav, TitledGrid } from "@/components/page/content";
import { futureGoals } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Future Goal", description: "Where RiTECHS is heading: global innovation, public awareness, lifelong learning and career advancement." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("future-goal", designedMetadata);
}

export default async function FutureGoalPage() {
  const edited = await getManagedPage("future-goal");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Future Goal" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/future-goal" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Future Goal" crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Future Goal" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/future-goal" />}>
        <TitledGrid items={futureGoals} />
      </PageBody>
    </main>
  );
}
