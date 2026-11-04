import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { getNews } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatPublicationDate } from "@/lib/utils";

/** Featured news: the four latest stories as image cards, like "Featured News" on usf.edu. */
export async function NewsSection() {
  const news = (await getNews()).slice(0, 4);
  if (!news.length) return null;
  return (
    <section id="news" aria-labelledby="news-heading" className="scroll-mt-20 bg-brand-wash py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="news-heading"
          title="News & Research Insights"
          description="Seminars, webinars, conference reports and announcements from the RiTECHS community."
          action={{ label: "All News", href: routes.news }}
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
          {news.map((a, i) => (
            <Reveal as="li" key={a.slug} index={i}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border-t-4 border-highlight bg-surface shadow-[0_14px_30px_-16px_rgb(18_24_30/0.4)] ring-1 ring-brand/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-18px_rgb(18_24_30/0.5)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-wash">
                  <Image
                    src={a.image.src}
                    alt={a.image.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
                    <span className="rounded-sm bg-brand-wash px-2 py-0.5 font-semibold text-brand">{a.category}</span>
                    <time dateTime={a.date} className="text-faint-ink">
                      {formatPublicationDate(a.date)}
                    </time>
                  </p>
                  <h3 className="mt-3 text-[1.0625rem] leading-snug font-semibold text-ink [text-wrap:pretty] group-hover:text-brand">
                    <Link href={routes.newsArticle(a.slug)} className="after:absolute after:inset-0">
                      {a.title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-ink">{a.excerpt}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
