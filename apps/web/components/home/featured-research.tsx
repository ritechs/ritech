import { SectionHeading } from "@/components/home/section-heading";
import { PublicationExplorer } from "@/components/publications/publication-explorer";
import { getFeaturedPublications } from "@/lib/api/publications";
import { routes } from "@/lib/site";

export async function FeaturedResearch() {
  const publications = await getFeaturedPublications();
  if (!publications.length) return null;
  return (
    <section id="featured" aria-labelledby="featured-heading" className="scroll-mt-20 bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="featured-heading"
          title="Featured Research"
          description="Recent journal articles and conference papers from the RiTECHS community. Filter by research area, or open an abstract without leaving the page."
          action={{ label: "View All Publications", href: routes.publications }}
        />
        <div className="mt-10">
          <PublicationExplorer publications={publications} limit={6} />
        </div>
      </div>
    </section>
  );
}
