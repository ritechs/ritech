import { richExcerpt, richToPlainText } from "@ritechs/shared";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page/page-header";
import { PageBody } from "@/components/page/content";
import { RichText } from "@/components/page/rich-text";
import { getManagedPage, type ManagedPageData } from "@/lib/server/content";

type Crumb = { label: string; href?: string };

/** A content page whose text was edited and published in Admin → Website Pages. */
export function ManagedPage({ page, crumbs, aside, after }: { page: ManagedPageData; crumbs: Crumb[]; aside?: React.ReactNode; /** Live content kept below the edited text (e.g. the event list). */ after?: React.ReactNode }) {
  return (
    <main id="main" className="flex-1">
      <PageHeader title={page.title} {...(page.intro ? { description: richToPlainText(page.intro) } : {})} crumbs={[...crumbs.slice(0, -1), { label: page.title }]} />
      <PageBody aside={aside}>
        <RichText html={page.body} />
        {after}
      </PageBody>
    </main>
  );
}

/** Page metadata: the edited page's title and description when one is published, else the designed page's. */
export async function managedMetadata(slug: string, fallback: Metadata): Promise<Metadata> {
  const p = await getManagedPage(slug);
  if (!p) return fallback;
  const description = p.metaDescription ?? (p.intro ? richExcerpt(p.intro, 160) : undefined) ?? fallback.description;
  return { ...fallback, title: p.title, ...(description ? { description } : {}) };
}
