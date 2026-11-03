import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/page/page-header";
import { getNews } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatPublicationDate } from "@/lib/utils";

export const metadata: Metadata = { title: "News & Insights", description: "News, seminars, webinars and conference reports from RiTECHS." };

export default async function NewsPage() {
  const news = await getNews();
  return (
    <main id="main" className="flex-1">
      <PageHeader
        title="News & Research Insights"
        description="Seminars, webinars, conference reports and announcements."
        crumbs={[{ label: "Home", href: "/" }, { label: "News & Insights" }]}
      />
      <div className="container-site py-12 md:py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((a) => (
            <li key={a.slug}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-surface">
                <div className="relative aspect-[16/9] bg-brand-wash">
                  <Image src={a.image.src} alt={a.image.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[0.8125rem]">
                    <span className="font-medium text-brand">{a.category}</span>
                    <span className="mx-2 text-rule-strong" aria-hidden>|</span>
                    <time dateTime={a.date} className="text-faint-ink">{formatPublicationDate(a.date)}</time>
                  </p>
                  <h2 className="mt-2 font-serif text-lg leading-snug text-ink group-hover:text-brand">
                    <Link href={routes.newsArticle(a.slug)} className="rounded-sm after:absolute after:inset-0">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-ink">{a.excerpt}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
