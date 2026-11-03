import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, LinkCard, PageBody } from "@/components/page/content";
import { academicModification, poster } from "@/lib/content/programmes";

const designedMetadata: Metadata = { title: "Solutions", description: "Academic modification (editing, proofreading, formatting) and poster presentation services." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("solutions", designedMetadata);
}

export default async function SolutionsPage() {
  const edited = await getManagedPage("solutions");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Solutions" }]} aside={<ContactCard heading="Request a service" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Solutions" description="Practical support to make your research writing and presentations ready for an audience." crumbs={[{ label: "Home", href: "/" }, { label: "Solutions" }]} />
      <PageBody aside={<ContactCard heading="Request a service" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LinkCard href="/academic-modification" title="Academic Modification" text={academicModification.intro.split(". ").slice(0, 1).join(". ") + "."} />
          <LinkCard href="/poster" title="Poster Presentation" text={poster.intro.split(". ")[0] + "."} />
          <LinkCard href="/eLearning" title="Training" text="Peer-reviewed online courses in core and emerging technologies." />
          <LinkCard href="/page-mentor" title="Mentoring" text="One-to-one guidance from experienced academics and industry researchers." />
        </div>
      </PageBody>
    </main>
  );
}
