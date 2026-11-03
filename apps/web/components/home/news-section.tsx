import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/home/section-heading";
import { getNews } from "@/lib/server/content";
import { routes } from "@/lib/site";
import type { NewsArticle } from "@/lib/types";
import { cn, formatPublicationDate } from "@/lib/utils";

function Meta({ article }: { article: NewsArticle }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
      <span className="font-medium text-brand">{article.category}</span>
      <span aria-hidden className="h-3 w-px bg-rule-strong" />
      <time dateTime={article.date} className="text-faint-ink">
        {formatPublicationDate(article.date)}
      </time>
    </p>
  );
}

function ReadLink({ article, className }: { article: NewsArticle; className?: string }) {
  return (
    <Link
      href={routes.newsArticle(article.slug)}
      className={cn(
        "group/link tap-target inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-brand after:absolute after:inset-0 hover:text-brand-strong",
        className,
      )}
    >
      Read Article
      <span className="sr-only">: {article.title}</span>
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export async function NewsSection() {
  const [lead, ...rest] = (await getNews()).slice(0, 5);
  if (!lead) return null;
  return (
    <section id="news" aria-labelledby="news-heading" className="scroll-mt-20 border-t border-rule bg-paper py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="news-heading"
          title="News & Research Insights"
          description="Seminars, webinars, conference reports and announcements from the RiTECHS community."
          action={{ label: "All News", href: routes.news }}
        />

        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-8">
          {/* Lead story */}
          <article className="group relative flex flex-col overflow-hidden rounded-lg border border-rule bg-surface lg:col-span-7">
            <div className="relative aspect-[16/9] overflow-hidden bg-brand-wash">
              <Image
                src={lead.image.src}
                alt={lead.image.alt}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <Meta article={lead} />
              <h3 className="mt-3 font-serif text-h3 text-ink [text-wrap:pretty] group-hover:text-brand">{lead.title}</h3>
              <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted-ink">{lead.excerpt}</p>
              <ReadLink article={lead} className="mt-6" />
            </div>
          </article>

          {/* Further stories */}
          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-rule">
            {rest.map((a) => (
              <li key={a.slug} className="lg:py-5 lg:first:pt-0 lg:last:pb-0">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-surface lg:flex-row lg:gap-5 lg:rounded-none lg:border-0 lg:bg-transparent">
                  <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-brand-wash lg:aspect-[4/3] lg:w-40 lg:rounded-md">
                    <Image
                      src={a.image.src}
                      alt={a.image.alt}
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 lg:p-0">
                    <Meta article={a} />
                    <h3 className="mt-2 font-serif text-[1.125rem] leading-snug text-ink [text-wrap:pretty] group-hover:text-brand">
                      {a.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-ink lg:hidden xl:block">{a.excerpt}</p>
                    <ReadLink article={a} className="mt-3" />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
