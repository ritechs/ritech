import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionNav, SectionTitle, TitledGrid } from "@/components/page/content";
import { poster } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Poster Presentation", description: poster.intro.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("poster", designedMetadata);
}

export default async function PosterPage() {
  const edited = await getManagedPage("poster");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Solutions", href: "/solutions" }, { label: "Poster Presentation" }]} aside={<><SectionNav title="Solutions" links={sectionLinks("Solutions")} current="/poster" /><ContactCard heading="Get your quote" person={poster.contact} /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Poster Presentation" crumbs={[{ label: "Home", href: "/" }, { label: "Solutions", href: "/solutions" }, { label: "Poster Presentation" }]} />
      <PageBody aside={<><SectionNav title="Solutions" links={sectionLinks("Solutions")} current="/poster" /><ContactCard heading="Get your quote" person={poster.contact} /></>}>
        <Prose paragraphs={[poster.intro]} />
        <SectionTitle>How to Manage the Poster</SectionTitle>
        <TitledGrid items={poster.guidance} columns={3} />
        <SectionTitle>What You Get</SectionTitle>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {poster.deliverables.map((d) => (
            <li key={d} className="flex items-center gap-3 rounded-lg border border-rule bg-surface p-4 text-ink">
              <Check className="size-4 shrink-0 text-brand" aria-hidden />
              {d}
            </li>
          ))}
        </ul>
      </PageBody>
    </main>
  );
}
