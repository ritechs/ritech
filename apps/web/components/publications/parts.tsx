import { getResearchArea } from "@/lib/data/research-areas";
import type { Publication } from "@/lib/types";
import { cn, formatAuthors, formatPublicationDate } from "@/lib/utils";

/** Marks demo records so they can never be mistaken for real publications. */
export function DemoBadge({ show, label = "Demo", className }: { show: boolean; label?: string; className?: string }) {
  if (!show) return null;
  return (
    <span
      title="Illustrative demonstration content — not a real record"
      className={cn(
        "inline-flex items-center rounded-sm border border-dashed border-[#9a7a2a]/60 bg-[#fbf6e9] px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium text-[#6b5214]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AreaBadge({ publication, className }: { publication: Publication; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm bg-brand-wash px-2 py-1 text-xs font-medium text-brand", className)}>
      {getResearchArea(publication.area).shortName}
    </span>
  );
}

export function AuthorLine({ publication, max = 3, className }: { publication: Publication; max?: number; className?: string }) {
  return (
    <p className={cn("text-sm text-ink/85", className)}>
      {formatAuthors(publication.authors.map((a) => a.name), max)}
    </p>
  );
}

export function PublicationDate({ publication, className }: { publication: Publication; className?: string }) {
  return (
    <time dateTime={publication.publishedAt} className={cn("whitespace-nowrap numerals-tabular", className)}>
      {formatPublicationDate(publication.publishedAt)}
    </time>
  );
}

/** Identifier line. Demo identifiers use the reserved 10.5555 prefix and are never linked. */
export function DoiLine({ publication, className }: { publication: Publication; className?: string }) {
  if (!publication.doi) return null;
  const isDemo = publication.source === "demo";
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] text-faint-ink", className)}>
      <abbr title="Digital Object Identifier" className="font-medium no-underline">
        DOI
      </abbr>
      {isDemo ? (
        <>
          <span className="font-mono text-[0.75rem] break-all">{publication.doi}</span>
          <span>(placeholder)</span>
        </>
      ) : (
        <a
          href={`https://doi.org/${publication.doi}`}
          className="font-mono text-[0.75rem] break-all text-brand underline decoration-brand/30 underline-offset-2"
        >
          {publication.doi}
        </a>
      )}
    </p>
  );
}
