import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, Prose, SectionNav } from "@/components/page/content";
import { benefits } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Benefits", description: benefits.paragraphs[0].slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("benefits", designedMetadata);
}

export default async function BenefitsPage() {
  const edited = await getManagedPage("benefits");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Benefits" }]} aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/benefits" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Benefits" crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Benefits" }]} />
      <PageBody aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/benefits" />}>
        <Prose paragraphs={benefits.paragraphs} />
      </PageBody>
    </main>
  );
}
