import Link from "next/link";
import { LegacyImage } from "@/components/media/legacy-image";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Conference } from "@/lib/types";
import { routes } from "@/lib/site";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function conferenceStatus(c: Conference, today: string): "upcoming" | "concluded" | "archive" {
  if (!c.endDate) return "archive";
  return c.endDate >= today ? "upcoming" : "concluded";
}

export function ConferenceStatus({ status, className }: { status: ReturnType<typeof conferenceStatus>; className?: string }) {
  const map = {
    upcoming: { label: "Upcoming", cls: "bg-success-wash text-success" },
    concluded: { label: "Concluded", cls: "bg-muted text-muted-ink" },
    archive: { label: "Archive", cls: "bg-muted text-muted-ink" },
  }[status];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", map.cls, className)}>{map.label}</span>;
}

/** Card for a conference in lists: acronym, title, dates, venue, status. */
export function ConferenceCard({ conference: c, today, showPoster = false }: { conference: Conference; today: string; /** Shows the poster above the text (when the conference has one). */ showPoster?: boolean }) {
  const status = conferenceStatus(c, today);
  const href = c.externalUrl ?? routes.conference(c.slug);
  const External = !!c.externalUrl;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-surface transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-[0_12px_28px_-20px_rgba(32,33,36,0.3)]">
      {showPoster && (
        <div className="relative aspect-[16/9] border-b border-rule bg-paper">
          <LegacyImage
            path={c.poster}
            alt=""
            sizes="(min-width: 1280px) 24rem, (min-width: 768px) 45vw, 100vw"
            fit="contain"
            fallback={<span aria-hidden className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-brand/25">{c.acronym}</span>}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-xl text-brand" translate="no">{c.acronym}</p>
        <ConferenceStatus status={status} />
      </div>
      <h3 className="mt-2 font-serif text-[1.1875rem] leading-snug text-ink [text-wrap:pretty]">
        {External ? (
          <a href={href} className="rounded-sm after:absolute after:inset-0 group-hover:text-brand">{c.title}</a>
        ) : (
          <Link href={href} className="rounded-sm after:absolute after:inset-0 group-hover:text-brand">{c.title}</Link>
        )}
      </h3>
      <ul className="mt-4 space-y-1.5 text-sm text-ink/85">
        {c.startDate && (
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-faint-ink" aria-hidden />
            <time dateTime={c.startDate}>{formatDateRange(c.startDate, c.endDate ?? c.startDate)}</time>
          </li>
        )}
        {c.location && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-faint-ink" aria-hidden />
            {c.location}
            {c.format === "Hybrid" && " · hybrid"}
          </li>
        )}
      </ul>
      <div className="flex-1" aria-hidden />
      <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand">
        {External ? "Visit conference site" : "Conference details"}
        <ArrowUpRight className="size-4" aria-hidden />
      </p>
      </div>
    </article>
  );
}
