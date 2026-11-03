import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom type scale in globals.css so
// `text-h2` is treated as a font size, not a colour that `text-ink` overrides.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["display", "h2", "h3"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2026-09-14" -> "14 September 2026" (fixed locale so server and client agree). */
export function formatPublicationDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** Join author names academically: "A, B and C"; truncates long lists with "et al." */
export function formatAuthors(names: string[], max = 4) {
  if (names.length === 0) return "";
  if (names.length > max) return `${names.slice(0, max - 1).join(", ")} et al.`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "2027-07-09", "2027-07-10" -> "9–10 July 2027" (collapses shared month/year). */
export function formatDateRange(startIso: string, endIso: string) {
  const s = new Date(`${startIso}T00:00:00Z`);
  const e = new Date(`${endIso}T00:00:00Z`);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(d);
  if (s.getUTCFullYear() !== e.getUTCFullYear())
    return `${formatPublicationDate(startIso)} – ${formatPublicationDate(endIso)}`;
  if (s.getUTCMonth() !== e.getUTCMonth())
    return `${fmt(s, { day: "numeric", month: "long" })} – ${formatPublicationDate(endIso)}`;
  return `${s.getUTCDate()}–${fmt(e, { day: "numeric", month: "long", year: "numeric" })}`;
}

/** "Dr. Kazi Shahdat Kabir" -> "KK"; ignores academic titles. */
export function initials(name: string) {
  const parts = name
    .replace(/\b(Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+/gi, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const LONDON = "Europe/London";

/** "Thu 19 November 2026" in UK time (where RiTECHS events are scheduled). */
export function formatEventDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: LONDON }).format(new Date(iso));
}

/** "15:00–16:30" in UK time. */
export function formatEventTimeRange(startIso: string, endIso: string) {
  const f = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: LONDON });
  return `${f.format(new Date(startIso))}–${f.format(new Date(endIso))}`;
}

/** Day number and short month for date blocks: { day: "19", month: "Nov" }. */
export function eventDateParts(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return {
    day: new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: LONDON }).format(d),
    month: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: LONDON }).format(d),
    year: new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: LONDON }).format(d),
  };
}

/**
 * Params for generateStaticParams. With Cache Components the list must not be
 * empty, so a placeholder (which renders the 404 page) stands in until the
 * database has records; real pages are rendered on first visit after that.
 */
export const staticSlugs = (slugs: string[]) => (slugs.length ? slugs : ["_none"]).map((slug) => ({ slug }));
