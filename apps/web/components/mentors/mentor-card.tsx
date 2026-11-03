import { LegacyImage } from "@/components/media/legacy-image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { routes } from "@/lib/site";
import type { Mentor } from "@/lib/types";
import { initials } from "@/lib/utils";

export function MentorAvatar({ mentor, size = "md" }: { mentor: Mentor; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-32 text-4xl" : "size-16 text-xl sm:size-20 sm:text-2xl";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md bg-brand-wash ${box}`}>
      <LegacyImage
        path={mentor.photo}
        alt=""
        sizes={size === "lg" ? "128px" : "80px"}
        fallback={
          <span aria-hidden className="absolute inset-0 flex items-center justify-center font-serif text-brand/80">
            {initials(mentor.name)}
          </span>
        }
      />
    </div>
  );
}

/** Mentor profile card: avatar, name, role, affiliation, expertise and profile link. */
export function MentorCard({ mentor }: { mentor: Mentor }) {
  return (
    <article className="group relative flex h-full gap-4 rounded-lg border border-rule bg-surface p-5 transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-[0_12px_28px_-20px_rgba(32,33,36,0.3)]">
      <MentorAvatar mentor={mentor} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-serif text-lg leading-snug text-ink">
          <Link href={routes.mentor(mentor.slug)} className="rounded-sm after:absolute after:inset-0 group-hover:text-brand">
            {mentor.name}
          </Link>
        </h3>
        {mentor.membership && (
          <p className="mt-1 w-fit rounded-sm bg-brand-wash px-1.5 py-0.5 text-xs font-medium text-brand">{mentor.membership}</p>
        )}
        <p className="mt-1 text-sm text-ink/85">{mentor.role}</p>
        <p className="text-sm text-muted-ink">{mentor.organisation}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-faint-ink">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {mentor.location}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          {mentor.expertise.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Research expertise">
              {mentor.expertise.slice(0, 4).map((e) => (
                <li key={e} className="rounded-sm bg-paper px-2 py-0.5 text-xs text-ink">
                  {e}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-faint-ink italic">Research expertise to be confirmed</p>
          )}
          <ArrowUpRight className="size-4 shrink-0 text-rule-strong transition-colors group-hover:text-brand" aria-hidden />
        </div>
      </div>
    </article>
  );
}
