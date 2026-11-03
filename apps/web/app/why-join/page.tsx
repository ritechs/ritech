import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, Prose, SectionNav, TitledGrid } from "@/components/page/content";
import { whyJoin } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Why to Join RiTECHS", description: whyJoin.intro.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("why-join", designedMetadata);
}

export default async function WhyJoinPage() {
  const edited = await getManagedPage("why-join");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Why to Join" }]} aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/why-join" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Why to Join RiTECHS" crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Why to Join" }]} />
      <PageBody aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/why-join" />}>
        <Prose paragraphs={[whyJoin.intro]} />
        <TitledGrid items={whyJoin.reasons} />
      </PageBody>
    </main>
  );
}
