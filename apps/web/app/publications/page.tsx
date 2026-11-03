import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page/page-header";
import { PublicationExplorer } from "@/components/publications/publication-explorer";
import { getAllPublications } from "@/lib/api/publications";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Publications",
  description: "Browse research papers published through RiTECHS journals and conferences, filtered by research area.",
};

export default async function PublicationsPage() {
  const publications = await getAllPublications();
  return (
    <main id="main" className="flex-1">
      <PageHeader
        title="Research & Publications"
        description="Journal articles, conference papers and reviews. Filter by research area, or press / to search by title, author or keyword."
        crumbs={[{ label: "Home", href: "/" }, { label: "Publications" }]}
      />
      <div className="container-site py-12 md:py-16">
        {publications.length ? (
          <PublicationExplorer publications={publications} />
        ) : (
          <p className="max-w-2xl rounded-lg border border-dashed border-rule-strong bg-paper p-6 text-[1rem] leading-relaxed text-muted-ink">
            Publications from the RiTECHS community will be listed here as they are added. For conference proceedings, see each conference&rsquo;s page under{" "}
            <Link href={routes.conferences} className="font-medium text-brand underline-offset-4 hover:underline">Conferences</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
