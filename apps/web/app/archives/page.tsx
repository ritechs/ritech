import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { LinkCard, PageBody, SectionNav } from "@/components/page/content";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Archives", description: "Past conferences, news and photographs from RiTECHS." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("archives", designedMetadata);
}

export default async function ArchivesPage() {
  const edited = await getManagedPage("archives");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Archives" }]} aside={<SectionNav title="Archives" links={sectionLinks("Archives")} current="/archives" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Archives" crumbs={[{ label: "Home", href: "/" }, { label: "Archives" }]} />
      <PageBody aside={<SectionNav title="Archives" links={sectionLinks("Archives")} current="/archives" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LinkCard href="/conference" title="Past Conferences" text="Every RiTECHS conference since ITSS-IoE 2021." />
          <LinkCard href="/news" title="News" text="Conference reports, seminars and webinars." />
          <LinkCard href="/gallery" title="Gallery" text="Photographs from RiTECHS events." />
        </div>
      </PageBody>
    </main>
  );
}
