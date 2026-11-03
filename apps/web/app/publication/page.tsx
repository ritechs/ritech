import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, Prose, SectionTitle } from "@/components/page/content";
import { publicationPage } from "@/lib/content/organisation";
import { routes } from "@/lib/site";

const designedMetadata: Metadata = { title: "Publication", description: publicationPage.paragraphs[0].slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("publication", designedMetadata);
}

export default async function PublicationPage() {
  const edited = await getManagedPage("publication");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Publication" }]} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Publication" crumbs={[{ label: "Home", href: "/" }, { label: "Publication" }]}>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild><Link href={routes.publications}>Browse Publications</Link></Button>
          <Button asChild variant="outline"><Link href={routes.conferences}>Conference Proceedings</Link></Button>
        </div>
      </PageHeader>
      <PageBody>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8"><Prose paragraphs={publicationPage.paragraphs} /></div>
          <div className="lg:col-span-4">
            <SectionTitle className="mt-0 text-xl">Disciplines</SectionTitle>
            <ul className="mt-4 divide-y divide-rule border-y border-rule">
              {publicationPage.disciplines.map((d) => (
                <li key={d} className="py-3 font-serif text-lg text-ink">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </PageBody>
    </main>
  );
}
