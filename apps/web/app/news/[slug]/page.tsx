import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page/page-header";
import { RichText } from "@/components/page/rich-text";
import { getNews, getNewsArticle } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatPublicationDate, staticSlugs } from "@/lib/utils";

export async function generateStaticParams() {
  return staticSlugs((await getNews()).map((a) => a.slug));
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getNewsArticle(slug);
  return a ? { title: a.title, description: a.excerpt } : { title: "Article not found" };
}

async function NewsArticlePageContent({ params }: { params: PageProps<"/news/[slug]">["params"] }) {
  const { slug } = await params;
  const a = await getNewsArticle(slug);
  if (!a) notFound();
  return (
    <main id="main" className="flex-1">
      <PageHeader title={a.title} crumbs={[{ label: "Home", href: "/" }, { label: "News & Insights", href: routes.news }, { label: a.category }]}>
        <p className="mt-4 text-sm text-faint-ink">
          <span className="font-medium text-brand">{a.category}</span>
          <span className="mx-2 text-rule-strong" aria-hidden>|</span>
          <time dateTime={a.date}>{formatPublicationDate(a.date)}</time>
        </p>
      </PageHeader>
      <article className="container-site max-w-4xl py-12 md:py-16">
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-brand-wash">
          <Image src={a.image.src} alt={a.image.alt} fill priority sizes="(min-width: 1024px) 56rem, 100vw" className="object-cover" />
        </div>
        {a.bodyHtml ? (
          <RichText html={a.bodyHtml} className="mt-8" />
        ) : (
          <div className="mt-8 max-w-[65ch] space-y-5 text-[1.0625rem] leading-[1.75] text-ink/90">
            {a.body.map((para, i) => (
              <p key={i} className={i === 0 ? "font-serif text-[1.1875rem]" : undefined}>{para}</p>
            ))}
          </div>
        )}
        <Link href={routes.news} className="tap-target mt-10 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-brand hover:text-brand-strong">
          <ArrowLeft className="size-4" aria-hidden />
          All news
        </Link>
      </article>
    </main>
  );
}

/**
 * `params` is read inside Suspense so pages added after the build (a new
 * conference, article or mentor) render on their first visit and are then cached.
 */
export default function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<main id="main" className="min-h-[70vh] flex-1 bg-paper" aria-busy="true" />}>
      <NewsArticlePageContent params={params} />
    </Suspense>
  );
}
