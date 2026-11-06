import { RichContent } from "@/components/page/rich-text";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav, SectionTitle } from "@/components/page/content";
import { LegacyImage } from "@/components/media/legacy-image";
import { getGallery } from "@/lib/server/content";
import { sectionLinks } from "@/lib/site";

export const metadata: Metadata = { title: "Gallery", description: "Photographs from RiTECHS conferences and events." };

export default async function GalleryPage() {
  const albums = (await getGallery()).filter((a) => a.photos.length);
  return (
    <main id="main" className="flex-1">
      <PageHeader title="Gallery" crumbs={[{ label: "Home", href: "/" }, { label: "Archives", href: "/archives" }, { label: "Gallery" }]} />
      <PageBody aside={<SectionNav title="Archives" links={sectionLinks("Archives")} current="/gallery" />}>
        {albums.length === 0 && (
          <p className="rounded-lg border border-dashed border-rule-strong bg-paper p-5 text-[0.9375rem] text-muted-ink">Photographs from our conferences and events will appear here.</p>
        )}
        {albums.map((a, i) => (
          <section key={a.slug} aria-labelledby={`album-${a.slug}`}>
            <SectionTitle id={`album-${a.slug}`} className={i === 0 ? "mt-0" : undefined}>{a.title}</SectionTitle>
            {a.description && <RichContent value={a.description} compact className="mt-3 text-[1rem] text-muted-ink" />}
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {a.photos.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-rule bg-brand-wash">
                    <span className="relative block aspect-[4/3]">
                      <LegacyImage path={p.url} alt={p.alt} sizes="(min-width: 640px) 22vw, 50vw" fallback={<span className="absolute inset-0 flex items-center justify-center p-3 text-center font-serif text-brand/70">{a.title}</span>} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </PageBody>
    </main>
  );
}
