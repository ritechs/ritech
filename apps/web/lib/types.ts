/**
 * Domain types for the RiTECHS frontend. Shapes are designed to map
 * directly onto the planned NestJS + Drizzle (PostgreSQL) API so that
 * swapping demo data for API calls needs no component changes.
 */

/** Where a record came from: verified organisational content, or illustrative demo data. */
export type ContentSource = "verified" | "demo";

/* ---------------------------------------------------------------- */
/* Research areas & publications                                    */
/* ---------------------------------------------------------------- */

export type ResearchAreaSlug =
  | "ai-ml"
  | "cybersecurity"
  | "data-science"
  | "software-engineering"
  | "sustainable-technology"
  | "emerging-technologies";

export interface ResearchArea {
  slug: ResearchAreaSlug;
  name: string;
  /** Short label for chips and badges. */
  shortName: string;
  description: string;
}

export interface Author {
  name: string;
  affiliation?: string;
}

export interface Publication {
  id: string;
  slug: string;
  title: string;
  authors: Author[];
  area: ResearchAreaSlug;
  /** ISO date, YYYY-MM-DD */
  publishedAt: string;
  type: "Journal article" | "Conference paper" | "Review";
  venue: string;
  volume?: string;
  abstract: string;
  keywords: string[];
  /** Example-prefix (10.5555) identifiers only in demo data — never a real DOI. */
  doi?: string;
  pdfUrl?: string;
  source: ContentSource;
}

export interface PublicationSearchParams {
  query: string;
  area?: ResearchAreaSlug | "all";
}

export interface PublicationSearchResult {
  items: Publication[];
  total: number;
}

/* ---------------------------------------------------------------- */
/* Events                                                           */
/* ---------------------------------------------------------------- */

export type EventCategory = "Conference" | "Seminar" | "Workshop" | "Webinar";
export type RegistrationStatus = "open" | "opening-soon" | "limited" | "closed";
export type AttendanceMode = "In person" | "Online" | "Hybrid";

export interface KeyDate {
  label: string;
  date: string;
}

export interface AcademicEvent {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  category: EventCategory;
  /** ISO date-time with offset, or a plain date for all-day events. */
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  timeZoneLabel?: string;
  mode: AttendanceMode;
  location: string;
  summary: string;
  description: string;
  registration: { status: RegistrationStatus; note: string };
  keyDates?: KeyDate[];
  people?: { role: string; names: string[] }[];
  image?: string;
  source: ContentSource;
}

/* ---------------------------------------------------------------- */
/* People, services, news, partners                                 */
/* ---------------------------------------------------------------- */

/** A course or training a mentor offers (managed in their dashboard). */
export interface MentorCourse {
  id: string;
  title: string;
  description: string;
  duration: number | null;
  durationUnit: string;
  fee: string | null;
  currency: string;
}

export interface Mentor {
  /** Profile id on the old site (/mentor-common-view/<id>); also the URL slug. */
  id: string;
  slug: string;
  name: string;
  /** Job title */
  role: string;
  /** Membership type when not a regular mentor, e.g. "Advisor". */
  membership?: string;
  organisation: string;
  location: string;
  expertise: string[];
  /** Path on the legacy asset host, e.g. "uploads/1635448689.png" (see lib/assets.ts). */
  photo?: string;
  bio?: string;
  profileUrl?: string;
  featured?: boolean;
  /** Research field and public research profiles (ORCID, Scholar…), from the API. */
  researchField?: string;
  links?: Partial<Record<MentorLinkKind, string>>;
  projects?: { title: string; topic?: string; collaborators?: string; year?: string }[];
  qualification?: string;
  citations?: number;
  courses?: MentorCourse[];
  resources?: { id: string; title: string; href: string; kind: "pdf" | "image" | "link" }[];
  source: ContentSource;
}

export type ServiceId = "publication" | "mentorship" | "conferences" | "editing" | "training" | "elearning";

export interface Service {
  id: ServiceId;
  title: string;
  description: string;
  cta: { label: string; href: string };
}

export type NewsCategory = "Webinar" | "Workshop" | "Seminar" | "Conference" | "Announcement";

export interface NewsArticle {
  /** Post id on the old site (/blog/details/<id>) */
  id: string;
  slug: string;
  category: NewsCategory;
  title: string;
  date: string;
  excerpt: string;
  body: string[];
  /** Sanitised HTML from the API; preferred over `body` when present. */
  bodyHtml?: string;
  image: { src: string; alt: string };
  source: ContentSource;
}

export interface Partner {
  name: string;
  /** Short monogram for the neutral fallback tile. */
  monogram: string;
  href?: string;
  /** Path on the legacy asset host (see lib/assets.ts). */
  logo?: string;
}

export interface ImpactStat {
  value: number;
  suffix?: string;
  label: string;
  description: string;
}

export type MentorLinkKind = "orcid" | "scholar" | "scopus" | "researchgate" | "website" | "linkedin" | "twitter" | "facebook" | "instagram";

/* ------------------------------- conferences ------------------------------- */

export interface Speaker {
  name: string;
  role?: string;
  organisation?: string;
  photo?: string;
}

export interface ConferenceTrack {
  title: string;
  description?: string;
  scope?: string;
  chairs?: string[];
}

export interface Conference {
  slug: string;
  acronym: string;
  title: string;
  /** ISO dates; undefined when not announced */
  startDate?: string;
  endDate?: string;
  location?: string;
  format?: "Hybrid" | "In person" | "Online & in person";
  publication: string[];
  summary?: string;
  objective?: string;
  tracks: ConferenceTrack[];
  speakers: Speaker[];
  generalChairs?: string[];
  keyDates: KeyDate[];
  externalUrl?: string;
  featured?: boolean;
  /** Poster or banner (uploaded, or still on the old site). */
  poster?: string;
}

/** Live counts from the database for the homepage. */
export interface SiteStats {
  conferences: number;
  mentors: number;
  members: number;
  partners: number;
  countries: number;
  events: number;
  publications: number;
}

export interface GalleryAlbum {
  slug: string;
  title: string;
  description?: string;
  coverUrl?: string;
  photos: { url: string; alt: string }[];
}
