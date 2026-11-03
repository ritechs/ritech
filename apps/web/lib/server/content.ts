import "server-only";

/**
 * Content for public pages, read from the API (the database staff edit in
 * /admin). Nothing here falls back to bundled data: with no API configured,
 * or when the API is unreachable while building, lists come back empty and
 * the pages show their empty states. The API asks the site to refresh every
 * tag when it starts, so a build made without it fills in once it is up.
 * Results are cached by tag and refreshed when the API calls
 * /internal/revalidate after an edit.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { AcademicEvent, Conference, GalleryAlbum, Mentor, MentorLinkKind, NewsArticle, Partner, SiteStats } from "@/lib/types";
import { apiInternalUrl, NotFoundError, serverApi } from "@/lib/server/api";

const building = () => process.env.NEXT_PHASE === "phase-production-build";

/** GET from the API; `empty` when no API is configured or it can't be reached during a build. */
async function load<T>(path: string, empty: T): Promise<T> {
  if (!apiInternalUrl) return empty;
  try {
    return await serverApi<T>(path);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (building()) {
      console.warn(`[content] ${path} unavailable during build; the page is rendered empty and refreshed when the API starts.`);
      return empty;
    }
    throw err;
  }
}

/** GET one record; undefined when it doesn't exist (or no API is configured). */
async function loadOne<T>(path: string): Promise<T | undefined> {
  try {
    return await load<T | undefined>(path, undefined);
  } catch (err) {
    if (err instanceof NotFoundError) return undefined;
    throw err;
  }
}

/* --------------------------------- mentors -------------------------------- */

interface ApiMentor {
  slug: string;
  name: string;
  position: string;
  qualification: string | null;
  affiliation: string;
  country: string | null;
  city: string | null;
  bio?: string;
  researchField?: string | null;
  links?: Partial<Record<MentorLinkKind, string>>;
  projects?: { title: string; topic?: string; collaborators?: string; year?: string }[];
  citations?: number | null;
  courses?: Mentor["courses"];
  resources?: Mentor["resources"];
  membershipLabel: string | null;
  featured: boolean;
  photoUrl: string | null;
  expertise: { name: string; slug: string }[];
}

const COUNTRY = new Intl.DisplayNames(["en-GB"], { type: "region" });
const fromApiMentor = (m: ApiMentor): Mentor => ({
  id: m.slug,
  slug: m.slug,
  name: m.name,
  role: m.position,
  ...(m.membershipLabel ? { membership: m.membershipLabel } : {}),
  organisation: m.affiliation,
  location: m.city ?? (m.country ? COUNTRY.of(m.country) ?? m.country : ""),
  expertise: m.expertise.map((e) => e.name),
  ...(m.photoUrl ? { photo: m.photoUrl } : {}),
  ...(m.bio ? { bio: m.bio } : {}),
  ...(m.researchField ? { researchField: m.researchField } : {}),
  ...(m.links && Object.keys(m.links).length ? { links: m.links } : {}),
  ...(m.projects?.length ? { projects: m.projects } : {}),
  ...(m.qualification ? { qualification: m.qualification } : {}),
  ...(m.citations ? { citations: m.citations } : {}),
  ...(m.courses?.length ? { courses: m.courses } : {}),
  ...(m.resources?.length ? { resources: m.resources } : {}),
  featured: m.featured,
  source: "verified",
});

export async function getMentors(): Promise<Mentor[]> {
  "use cache";
  cacheTag("mentors");
  cacheLife("hours");
  const out: Mentor[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await load<{ items: ApiMentor[]; pages: number }>(`/mentors?pageSize=100&page=${page}`, { items: [], pages: 0 });
    out.push(...res.items.map(fromApiMentor));
    if (page >= res.pages) break;
  }
  return out;
}

export async function getFeaturedMentors(): Promise<Mentor[]> {
  "use cache";
  cacheTag("mentors");
  cacheLife("hours");
  // All popular mentors (the old homepage showed every one); the directory API lists featured ones first.
  const res = await load<{ items: ApiMentor[] }>("/mentors?featured=true&pageSize=60", { items: [] });
  return res.items.filter((m) => m.featured).map(fromApiMentor);
}

export async function getMentorBySlug(slug: string): Promise<Mentor | undefined> {
  "use cache";
  cacheTag("mentors", `mentor:${slug}`);
  cacheLife("hours");
  const m = await loadOne<ApiMentor>(`/mentors/${encodeURIComponent(slug)}`);
  return m && fromApiMentor(m);
}

/* ---------------------------------- news ---------------------------------- */

interface ApiNews { id: string; slug: string; title: string; category: string; excerpt: string; body?: string; publishedAt: string | null; coverUrl: string | null }

/** Illustrations for articles without a photo of their own. */
const COVERS: Record<string, string> = {
  Webinar: "/images/news/quantitative-analysis.png",
  Workshop: "/images/news/cybersecurity.png",
  Seminar: "/images/news/publishing.png",
  Conference: "/images/news/smart-technology.png",
  Announcement: "/images/news/smart-technology.png",
};
const fromApiNews = (n: ApiNews): NewsArticle => ({
  id: n.id,
  slug: n.slug,
  category: n.category as NewsArticle["category"],
  title: n.title,
  date: (n.publishedAt ?? "").slice(0, 10),
  excerpt: n.excerpt,
  body: [],
  ...(n.body ? { bodyHtml: n.body } : {}),
  image: { src: n.coverUrl ?? COVERS[n.category] ?? COVERS.Announcement!, alt: "" },
  source: "verified",
});

export async function getNews(): Promise<NewsArticle[]> {
  "use cache";
  cacheTag("news");
  cacheLife("hours");
  const res = await load<{ items: ApiNews[] }>("/news?pageSize=100", { items: [] });
  return res.items.map(fromApiNews);
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | undefined> {
  "use cache";
  cacheTag("news", `news:${slug}`);
  cacheLife("hours");
  const n = await loadOne<ApiNews>(`/news/${encodeURIComponent(slug)}`);
  return n && fromApiNews(n);
}

/* -------------------------------- partners -------------------------------- */

export async function getPartners(): Promise<Partner[]> {
  "use cache";
  cacheTag("partners");
  cacheLife("hours");
  const rows = await load<{ name: string; acronym: string | null; website: string | null; legacyLogoPath: string | null; logoUrl: string | null }[]>("/partners", []);
  return rows.map((p) => ({
    name: p.name,
    monogram: p.acronym ?? p.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 4),
    ...(p.website ? { href: p.website } : {}),
    ...((p.logoUrl ?? p.legacyLogoPath) ? { logo: (p.logoUrl ?? p.legacyLogoPath)! } : {}),
  }));
}

/* ---------------------------------- stats --------------------------------- */

const NO_STATS: SiteStats = { conferences: 0, mentors: 0, members: 0, partners: 0, countries: 0, events: 0, publications: 0 };

/** Live counts for the homepage; refreshed whenever any of them can change. */
export async function getStats(): Promise<SiteStats> {
  "use cache";
  cacheTag("stats", "conferences", "mentors", "partners", "events", "publications");
  cacheLife("hours");
  return load<SiteStats>("/stats", NO_STATS);
}

/* --------------------------------- gallery -------------------------------- */

export async function getGallery(): Promise<GalleryAlbum[]> {
  "use cache";
  cacheTag("gallery");
  cacheLife("hours");
  const albums = await load<{ slug: string; title: string; description: string | null; coverUrl: string | null }[]>("/gallery", []);
  return Promise.all(
    albums.map(async (a) => {
      const full = await loadOne<{ items: { url: string | null; alt: string | null; caption: string | null }[] }>(`/gallery/${encodeURIComponent(a.slug)}`);
      return {
        slug: a.slug,
        title: a.title,
        ...(a.description ? { description: a.description } : {}),
        ...(a.coverUrl ? { coverUrl: a.coverUrl } : {}),
        photos: (full?.items ?? []).filter((i) => i.url).map((i, n) => ({ url: i.url!, alt: i.alt ?? i.caption ?? `${a.title}, photo ${n + 1}` })),
      };
    }),
  );
}

/* ------------------------------- conferences ------------------------------ */

export interface FeeRow { category: string; early?: string; regular?: string; online?: string; overseas?: string }

export interface ConferenceDetails {
  highlightsHtml?: string;
  aboutHtml?: string;
  joinUsHtml?: string;
  submissionHtml?: string;
  cameraReadyHtml?: string;
  cameraReadyUrl?: string;
  cameraReadyFileUrl?: string;
  callForPapersUrl?: string;
  coverUrl?: string;
  fees: FeeRow[];
  feesNote?: string;
  awards: { title: string; prize: string }[];
  sponsorship: { tier: string; price: string; availability: string; highlights: string[] }[];
  committee: { role: string; names: string[] }[];
  sponsors: { name: string; website?: string; logo?: string }[];
  socialLinks: { network: string; url: string }[];
}

export type ConferencePage = Conference & { details: ConferenceDetails; submissionUrl?: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
const amount = (v: string | null | undefined, currency: string | null | undefined) =>
  v == null ? undefined : `${currency ?? ""} ${Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`.trim();
const format = (mode: string): Conference["format"] => (mode === "hybrid" ? "Hybrid" : mode === "online" ? "Online & in person" : "In person");
const has = (v: unknown) => (v ? v : undefined);

function fromApiConference(c: any): ConferencePage {
  const notes = [c.registrationNote, ...(c.fees ?? []).map((f: any) => f.note)].filter(Boolean);
  const speakers = (c.speakers ?? []).map((s: any) => ({ name: s.name, ...(s.designation ? { role: s.designation } : {}), ...(s.organisation ? { organisation: s.organisation } : {}), ...(s.photoUrl ? { photo: s.photoUrl } : {}) }));
  const details: ConferenceDetails = {
    fees: (c.fees ?? []).map((f: any) => {
      const row: FeeRow = { category: f.category };
      const early = amount(f.earlyAmount, f.currency), regular = amount(f.regularAmount, f.currency), online = amount(f.onlineAmount, f.currency), overseas = amount(f.overseasAmount, f.overseasCurrency ?? f.currency);
      if (early) row.early = early;
      if (regular) row.regular = regular;
      if (online) row.online = online;
      if (overseas) row.overseas = overseas;
      return row;
    }),
    awards: (c.awards ?? []).map((a: any) => ({ title: a.title, prize: a.prize })),
    sponsorship: (c.sponsorship ?? []).map((p: any) => ({ tier: p.tier, price: amount(p.price, p.currency) ?? "", availability: p.availability ?? "", highlights: p.benefits ?? [] })),
    committee: (c.committee ?? []).map((g: any) => ({ role: g.role, names: g.members ?? [] })),
    sponsors: (c.sponsors ?? []).map((s: any) => ({ name: s.name, ...(s.website ? { website: s.website } : {}), ...(s.logoUrl ? { logo: s.logoUrl } : {}) })),
    socialLinks: c.socialLinks ?? [],
  };
  const optional = {
    highlightsHtml: has(c.highlights), aboutHtml: has(c.about), joinUsHtml: has(c.joinUs), submissionHtml: has(c.paperSubmission), cameraReadyHtml: has(c.cameraReady),
    cameraReadyUrl: has(c.cameraReadyUrl), cameraReadyFileUrl: has(c.cameraReadyFileUrl), callForPapersUrl: has(c.callForPapersUrl), coverUrl: has(c.coverUrl),
    feesNote: notes.length ? notes.join(" ") : undefined,
  };
  for (const [k, v] of Object.entries(optional)) if (v) (details as any)[k] = v;
  return {
    slug: c.slug,
    acronym: c.acronym,
    title: c.title,
    ...(c.startDate ? { startDate: c.startDate } : {}),
    ...(c.endDate ? { endDate: c.endDate } : {}),
    ...(c.location ? { location: c.location } : {}),
    format: format(c.mode),
    publication: c.publication ?? [],
    ...(c.summary ? { summary: c.summary } : {}),
    ...(c.objective ? { objective: c.objective } : {}),
    tracks: (c.tracks ?? []).map((t: any) => ({ title: t.title, ...(t.description ? { description: t.description } : {}), ...(t.scope ? { scope: t.scope } : {}), ...(t.chairs?.length ? { chairs: t.chairs } : {}) })),
    speakers,
    keyDates: (c.dates ?? []).map((d: any) => ({ label: d.label, date: d.date })),
    ...(c.externalUrl ? { externalUrl: c.externalUrl } : {}),
    ...(c.submissionUrl ? { submissionUrl: c.submissionUrl } : {}),
    generalChairs: (c.committee ?? []).find((g: any) => /general chair/i.test(g.role))?.members,
    featured: !!c.featured,
    details,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getConferences(): Promise<Conference[]> {
  "use cache";
  cacheTag("conferences");
  cacheLife("hours");
  const res = await load<{ items: { slug: string; acronym: string; title: string; location: string | null; mode: string; startDate: string | null; endDate: string | null; externalUrl: string | null; featured: boolean; coverUrl: string | null }[] }>(
    "/conferences?pageSize=100",
    { items: [] },
  );
  return res.items.map((c) => ({
    slug: c.slug,
    acronym: c.acronym,
    title: c.title,
    ...(c.startDate ? { startDate: c.startDate } : {}),
    ...(c.endDate ? { endDate: c.endDate } : {}),
    ...(c.location ? { location: c.location } : {}),
    format: format(c.mode),
    publication: [],
    tracks: [],
    speakers: [],
    keyDates: [],
    ...(c.externalUrl ? { externalUrl: c.externalUrl } : {}),
    featured: c.featured,
    ...(c.coverUrl ? { poster: c.coverUrl } : {}),
  }));
}

export async function getConferencePage(slug: string): Promise<ConferencePage | undefined> {
  "use cache";
  cacheTag("conferences", `conference:${slug}`);
  cacheLife("hours");
  const c = await loadOne<unknown>(`/conferences/${encodeURIComponent(slug)}`);
  return c ? fromApiConference(c) : undefined;
}

export async function getRecentConferences(excludeSlug?: string): Promise<Conference[]> {
  "use cache";
  cacheTag("conferences");
  cacheLife("hours");
  return (await getConferences())
    .filter((c) => c.slug !== excludeSlug && c.startDate)
    .sort((a, b) => b.startDate!.localeCompare(a.startDate!))
    .slice(0, 3);
}

/** Designed artwork for a conference, used instead of its uploaded flyer on the homepage. */
const CONFERENCE_ART: Record<string, string> = { "DTISB-2027": "/images/conference-dtisb.png" };

const firstSentences = (html: string | undefined, max = 220) => {
  const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
};

/**
 * The homepage's featured conference: the one marked "featured" in the admin,
 * otherwise the next upcoming one. Null when there is none.
 */
export async function getFeaturedConference(): Promise<AcademicEvent | null> {
  "use cache";
  cacheTag("conferences");
  cacheLife("hours");
  const today = new Date().toISOString().slice(0, 10);
  const list = await getConferences();
  const upcoming = list.filter((c) => !c.externalUrl && c.startDate && (c.endDate ?? c.startDate) >= today).sort((a, b) => a.startDate!.localeCompare(b.startDate!));
  const pick = list.find((c) => c.featured && !c.externalUrl) ?? upcoming[0];
  if (!pick) return null;
  const c = await getConferencePage(pick.slug);
  if (!c?.startDate) return null;
  const endsAt = c.endDate ?? c.startDate;
  const next = c.keyDates.find((k) => k.date >= today);
  const about = c.objective ?? firstSentences(c.details.aboutHtml, 2000);
  return {
    id: `conference-${c.slug}`,
    slug: c.slug,
    title: c.title,
    shortTitle: c.acronym,
    category: "Conference",
    startsAt: c.startDate,
    endsAt,
    allDay: true,
    mode: c.format === "Hybrid" ? "Hybrid" : "In person",
    location: c.format === "Hybrid" && c.location ? `${c.location} — in person and online` : (c.location ?? ""),
    summary: c.summary ?? firstSentences(c.details.highlightsHtml || c.details.aboutHtml) ?? c.title,
    description: about || c.title,
    registration: endsAt >= today ? { status: "open", note: next ? `${next.label}: ${next.date}` : "" } : { status: "closed", note: "" },
    keyDates: c.keyDates.filter((k) => k.date >= today).slice(0, 5),
    people: [
      { role: "General chairs", names: c.generalChairs ?? [] },
      { role: "Keynote speakers", names: c.speakers.map((s) => s.name) },
    ].filter((p) => p.names.length),
    ...((CONFERENCE_ART[c.slug] ?? c.details.coverUrl) ? { image: CONFERENCE_ART[c.slug] ?? c.details.coverUrl } : {}),
    source: "verified",
  };
}

/* --------------------------------- events --------------------------------- */

export type EventType = "seminar" | "bootcamp" | "research-adda" | "cyber4me" | "workshop" | "webinar";

export interface EventItem {
  slug: string;
  type: EventType;
  title: string;
  summary?: string;
  location?: string;
  mode: string;
  startsAt?: string;
  endsAt?: string;
  /** How the organisers wrote the date, e.g. "To be announced". */
  scheduleNote?: string;
  fee: number;
  currency: string;
}

/** Published events, optionally of one type; dated ones newest first, then those still to be announced. */
export async function getEvents(type?: EventType): Promise<EventItem[]> {
  "use cache";
  cacheTag("events");
  cacheLife("hours");
  const qs = new URLSearchParams({ pageSize: "100", when: "all", ...(type ? { type } : {}) });
  type Row = { slug: string; type: EventType; title: string; summary: string | null; location: string | null; mode: string; startsAt: string | null; endsAt: string | null; scheduleNote: string | null; fee: string | null; currency: string };
  const res = await load<{ items: Row[] }>(`/events?${qs}`, { items: [] });
  return res.items.map((e) => ({
    slug: e.slug,
    type: e.type,
    title: e.title,
    ...(e.summary ? { summary: e.summary } : {}),
    ...(e.location && !/^tba$/i.test(e.location) ? { location: e.location } : {}),
    mode: e.mode,
    ...(e.startsAt ? { startsAt: e.startsAt } : {}),
    ...(e.endsAt ? { endsAt: e.endsAt } : {}),
    ...(e.scheduleNote ? { scheduleNote: e.scheduleNote } : {}),
    fee: Number(e.fee ?? 0),
    currency: e.currency,
  }));
}

/* ------------------------------ website pages ----------------------------- */

export interface ManagedPageData {
  slug: string;
  title: string;
  intro: string | null;
  body: string;
  metaDescription: string | null;
}

/**
 * A page's published text from Admin → Website Pages, or undefined while the
 * website should keep showing its designed version (no page, or a draft).
 */
export async function getManagedPage(slug: string): Promise<ManagedPageData | undefined> {
  "use cache";
  cacheTag("pages", `page:${slug}`);
  cacheLife("hours");
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return undefined;
  const p = await loadOne<ManagedPageData & { status: string }>(`/pages/${encodeURIComponent(slug)}`).catch((err) => {
    // A missing page is normal; anything else must not take the designed page down.
    console.warn(`[content] page ${slug}:`, (err as Error).message);
    return undefined;
  });
  return p && p.body.trim() ? { slug: p.slug, title: p.title, intro: p.intro, body: p.body, metaDescription: p.metaDescription } : undefined;
}

/** Published pages created in the admin (not built into the website), for /pages/<slug>. */
export async function getCustomPages(): Promise<{ slug: string; title: string }[]> {
  "use cache";
  cacheTag("pages");
  cacheLife("hours");
  const { sitePage } = await import("@/lib/content/site-pages");
  return (await load<{ slug: string; title: string }[]>("/pages", [])).filter((p) => !sitePage(p.slug));
}
