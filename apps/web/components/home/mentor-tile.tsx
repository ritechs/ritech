import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { MentorPhoto } from "@/components/home/mentor-photo";
import { routes } from "@/lib/site";
import type { Mentor } from "@/lib/types";

/** Names typed in all capitals or all lower case ("ARIF REZA", "shavan") shown in normal case. */
function displayName(name: string) {
  const letters = name.replace(/[^\p{L}]/gu, "");
  if (!letters || (letters !== letters.toUpperCase() && letters !== letters.toLowerCase())) return name;
  return name.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Home-page mentor card: a portrait photo with an angled lower edge (like the
 * site's section bands), the location on a glass tag over the photo, then the
 * name, role, organisation and up to two areas of expertise.
 */
export function MentorTile({ mentor }: { mentor: Mentor }) {
  const name = displayName(mentor.name);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-[0_14px_30px_-16px_rgb(18_24_30/0.38)] ring-1 ring-brand/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_44px_-20px_rgb(18_24_30/0.5)]">
      <div className="relative aspect-[4/4.4] overflow-hidden bg-brand-wash [clip-path:polygon(0_0,100%_0,100%_86%,0_100%)]">
        <MentorPhoto mentor={mentor} />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-darkest/75 via-brand-darkest/25 to-transparent" />
        {mentor.membership && (
          <span className="absolute top-3 left-3 rounded-full bg-highlight px-2.5 py-0.5 text-xs font-semibold text-on-highlight">{mentor.membership}</span>
        )}
        {mentor.location && (
          <span className="absolute bottom-[16%] left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm backdrop-blur-sm">
            <MapPin className="size-3.5 shrink-0 text-highlight" aria-hidden />
            <span className="truncate">{mentor.location}</span>
          </span>
        )}
      </div>

      <div className="relative -mt-3 flex flex-1 flex-col px-5 pb-5">
        <span aria-hidden className="mb-3 block h-1 w-10 rounded-full bg-highlight transition-[width] duration-300 group-hover:w-16" />
        <h3 className="text-[1.0625rem] leading-snug font-semibold text-ink [text-wrap:balance]">
          <Link href={routes.mentor(mentor.slug)} className="rounded-sm after:absolute after:inset-0 group-hover:text-brand">
            {name}
          </Link>
        </h3>
        {mentor.role && <p className="mt-1 text-sm font-medium text-brand">{mentor.role}</p>}
        {mentor.organisation && <p className="mt-0.5 text-sm leading-snug text-muted-ink">{mentor.organisation}</p>}
        {mentor.expertise.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Research expertise">
            {mentor.expertise.slice(0, 2).map((e) => (
              <li key={e} className="max-w-full truncate rounded-full bg-brand-wash px-2.5 py-0.5 text-xs text-brand">
                {e}
              </li>
            ))}
          </ul>
        )}
        <span aria-hidden className="min-h-4 flex-1" />
        <span className="flex items-center justify-between border-t border-rule pt-3.5 text-sm font-semibold text-brand">
          View Profile
          <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-full bg-brand text-white transition-colors group-hover:bg-highlight group-hover:text-on-highlight">
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </article>
  );
}
