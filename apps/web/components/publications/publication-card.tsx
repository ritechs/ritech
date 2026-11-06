import { richToPlainText } from "@ritechs/shared";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AbstractDialog } from "@/components/publications/abstract-dialog";
import { AreaBadge, AuthorLine, DemoBadge, DoiLine, PublicationDate } from "@/components/publications/parts";
import { routes } from "@/lib/site";
import type { Publication } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Research paper card: badge row, title, authors, venue, abstract preview, identifier, actions. */
export function PublicationCard({ publication, className }: { publication: Publication; className?: string }) {
  return (
    <article
      aria-labelledby={`pub-${publication.id}`}
      className={cn(
        "flex h-full flex-col rounded-lg border border-rule bg-surface p-6 transition-[border-color,box-shadow] duration-200 hover:border-rule-strong hover:shadow-[0_12px_28px_-18px_rgba(32,33,36,0.28)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <AreaBadge publication={publication} />
        <DemoBadge show={publication.source === "demo"} />
      </div>

      <h3 id={`pub-${publication.id}`} className="mt-4 font-serif text-[1.25rem] leading-snug text-ink [text-wrap:pretty]">
        <Link href={routes.publication(publication.slug)} className="rounded-sm hover:text-brand">
          {publication.title}
        </Link>
      </h3>
      <AuthorLine publication={publication} className="mt-2.5" />
      <p className="mt-1 text-[0.8125rem] text-faint-ink">
        {publication.type}, <PublicationDate publication={publication} />
      </p>
      <p className="mt-0.5 line-clamp-2 font-serif text-[0.875rem] text-faint-ink italic">{publication.venue}</p>

      <p className="mt-4 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted-ink">{richToPlainText(publication.abstract)}</p>
      <DoiLine publication={publication} className="mt-4" />

      <div className="flex-1" aria-hidden />
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-rule pt-4">
        <AbstractDialog
          publication={publication}
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
            >
              Read Abstract
            </button>
          }
        />
        <Link
          href={routes.publication(publication.slug)}
          className="group inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-brand hover:text-brand-strong"
        >
          View Paper
          <span className="sr-only">: {publication.title}</span>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
