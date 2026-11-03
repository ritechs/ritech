import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page/page-header";
import { AreaBadge, DemoBadge, DoiLine, PublicationDate } from "@/components/publications/parts";
import { getAllPublications, getPublicationBySlug } from "@/lib/api/publications";
import { getResearchArea } from "@/lib/data/research-areas";
import { routes } from "@/lib/site";
import { staticSlugs } from "@/lib/utils";

export async function generateStaticParams() {
  return staticSlugs((await getAllPublications()).map((p) => p.slug));
}

export async function generateMetadata({ params }: PageProps<"/publications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicationBySlug(slug);
  if (!p) return { title: "Publication not found" };
  return { title: p.title, description: p.abstract.slice(0, 155) };
}

async function PublicationPageContent({ params }: { params: PageProps<"/publications/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await getPublicationBySlug(slug);
  if (!p) notFound();
  const area = getResearchArea(p.area);

  return (
    <main id="main" className="flex-1">
      <PageHeader
        title={p.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Publications", href: routes.publications },
          { label: area.shortName },
        ]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <AreaBadge publication={p} />
          <span className="text-sm text-faint-ink">{p.type}</span>
          <DemoBadge show={p.source === "demo"} label="Demo paper" />
        </div>
      </PageHeader>

      <div className="container-site grid gap-12 py-12 md:py-16 lg:grid-cols-12 lg:gap-16">
        <article className="lg:col-span-8">
          {p.source === "demo" && (
            <p className="mb-8 rounded-md border border-dashed border-[#9a7a2a]/50 bg-[#fbf6e9] px-4 py-3 text-sm text-[#5c460f]">
              This is a demonstration record used to design the site. It is not a real publication.
            </p>
          )}
          <h2 className="text-sm font-medium text-ink">Abstract</h2>
          <p className="mt-3 max-w-[68ch] font-serif text-[1.1875rem] leading-[1.75] text-ink/90 numerals-oldstyle">{p.abstract}</p>
          <h2 className="mt-10 text-sm font-medium text-ink">Keywords</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.keywords.map((k) => (
              <li key={k} className="rounded-sm border border-rule px-2.5 py-1 text-sm text-muted-ink">
                {k}
              </li>
            ))}
          </ul>
          <Link href={routes.publications} className="mt-12 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-brand hover:text-brand-strong">
            <ArrowLeft className="size-4" aria-hidden />
            All publications
          </Link>
        </article>

        <aside className="lg:col-span-4">
          <div className="rounded-lg border border-rule bg-paper p-6">
            <dl className="space-y-4 text-[0.9375rem]">
              <div>
                <dt className="text-sm text-faint-ink">Authors</dt>
                <dd className="mt-1 text-ink">{p.authors.map((a) => a.name).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-sm text-faint-ink">Published in</dt>
                <dd className="mt-1 font-serif text-ink italic">
                  {p.venue}
                  {p.volume && <span className="font-sans not-italic">, {p.volume}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-faint-ink">Date</dt>
                <dd className="mt-1 text-ink">
                  <PublicationDate publication={p} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-faint-ink">Identifier</dt>
                <dd className="mt-1">
                  <DoiLine publication={p} />
                </dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-rule pt-5">
              {p.pdfUrl ? (
                <Button asChild className="w-full">
                  <a href={p.pdfUrl} download>
                    <Download aria-hidden />
                    Download PDF
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-ink">The full-text PDF will be available here once the paper is published.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/**
 * `params` is read inside Suspense so pages added after the build (a new
 * conference, article or mentor) render on their first visit and are then cached.
 */
export default function PublicationPage({ params }: PageProps<"/publications/[slug]">) {
  return (
    <Suspense fallback={<main id="main" className="min-h-[70vh] flex-1 bg-paper" aria-busy="true" />}>
      <PublicationPageContent params={params} />
    </Suspense>
  );
}
