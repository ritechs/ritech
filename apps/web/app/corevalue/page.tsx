import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav, TitledGrid } from "@/components/page/content";
import { coreValues } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Core Value", description: "Integrity, research advocacy, service to society and dependability." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("corevalue", designedMetadata);
}

export default async function CoreValuePage() {
  const edited = await getManagedPage("corevalue");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Core Value" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/corevalue" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Core Value" description="The principles that guide how RiTECHS works with researchers, partners and society." crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Core Value" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/corevalue" />}>
        <TitledGrid items={coreValues} />
      </PageBody>
    </main>
  );
}
