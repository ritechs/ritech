/** Admin input schemas for content. Rich text is sanitised in the service. */
import { ATTENDANCE_MODES, EVENT_TYPES, PUBLISH_STATUSES, countryCode, httpsUrl, isoDate, line, paragraphText, slug } from "@ritechs/shared";
import { z } from "zod";
import { listQuery } from "../../common/http.js";

const money = z.union([z.number().nonnegative().max(1_000_000), z.string().regex(/^\d{1,7}(\.\d{1,2})?$/)]).transform(String).nullable().optional();
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD");
const richText = z.string().max(100_000);
const optionalUrl = httpsUrl.nullable().optional();
const mediaId = z.uuid().nullable().optional();
const status = z.enum(PUBLISH_STATUSES).default("draft");

export const conferenceInput = z
  .object({
    slug,
    acronym: line(40),
    title: line(300),
    summary: paragraphText(1000).nullable().optional(),
    objective: paragraphText(5000).nullable().optional(),
    about: richText.nullable().optional(),
    joinUs: richText.nullable().optional(),
    paperSubmission: richText.nullable().optional(),
    highlights: richText.nullable().optional(),
    cameraReady: richText.nullable().optional(),
    cameraReadyUrl: optionalUrl,
    registrationNote: paragraphText(2000).nullable().optional(),
    socialLinks: z.array(z.object({ network: z.enum(["facebook", "linkedin", "twitter", "youtube", "instagram", "website"]), url: httpsUrl })).max(10).default([]),
    publication: z.array(line(500)).max(20).default([]),
    venue: line(200).nullable().optional(),
    location: line(200).nullable().optional(),
    mode: z.enum(ATTENDANCE_MODES).default("in-person"),
    startDate: isoDate.nullable().optional(),
    endDate: isoDate.nullable().optional(),
    timezone: z.string().max(60).default("Europe/London"),
    externalUrl: optionalUrl,
    submissionUrl: optionalUrl,
    coverId: mediaId,
    callForPapersId: mediaId,
    /** Files from the old site can only be removed (null); new files are uploaded as media. */
    legacyCoverPath: z.null().optional(),
    legacyCallForPapersPath: z.null().optional(),
    legacyCameraReadyPath: z.null().optional(),
    status,
    featured: z.boolean().default(false),
    tracks: z.array(z.object({ title: line(300), description: paragraphText(3000).nullable().optional(), scope: paragraphText(3000).nullable().optional(), chairs: z.array(line(300)).max(20).default([]) })).max(40).default([]),
    dates: z.array(z.object({ label: line(200), date: isoDate })).max(30).default([]),
    fees: z.array(z.object({ category: line(200), earlyAmount: money, regularAmount: money, onlineAmount: money, currency, overseasAmount: money, overseasCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional(), note: paragraphText(1000).nullable().optional() })).max(30).default([]),
    committee: z.array(z.object({ role: line(200), members: z.array(line(300)).max(200) })).max(40).default([]),
    awards: z.array(z.object({ title: line(200), prize: line(60) })).max(20).default([]),
    sponsorship: z.array(z.object({ tier: line(120), price: money.transform((v) => v ?? "0"), currency, availability: line(200).nullable().optional(), benefits: z.array(line(400)).max(30).default([]) })).max(20).default([]),
    speakerIds: z.array(z.object({ id: z.uuid(), role: line(60).default("speaker") })).max(100).default([]),
    sponsorIds: z.array(z.object({ id: z.uuid(), tier: line(60).nullable().optional() })).max(100).default([]),
  })
  .refine((c) => !c.startDate || !c.endDate || c.endDate >= c.startDate, { message: "The end date must be on or after the start date.", path: ["endDate"] });
export type ConferenceInput = z.infer<typeof conferenceInput>;

export const eventInput = z
  .object({
    slug,
    type: z.enum(EVENT_TYPES),
    title: line(300),
    summary: paragraphText(1000).nullable().optional(),
    description: richText.nullable().optional(),
    venue: line(200).nullable().optional(),
    location: line(200).nullable().optional(),
    mode: z.enum(ATTENDANCE_MODES).default("in-person"),
    startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
    endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
    timezone: z.string().max(60).default("Europe/London"),
    fee: money,
    currency: currency.default("GBP"),
    capacity: z.number().int().positive().max(100_000).nullable().optional(),
    registrationOpen: z.boolean().default(false),
    coverId: mediaId,
    status,
    speakerIds: z.array(z.uuid()).max(50).default([]),
  })
  .refine((e) => !e.startsAt || !e.endsAt || e.endsAt >= e.startsAt, { message: "The end must be after the start.", path: ["endsAt"] });
export type EventInput = z.infer<typeof eventInput>;

export const newsInput = z.object({
  slug,
  title: line(300),
  category: z.enum(["Webinar", "Workshop", "Seminar", "Conference", "Announcement"]),
  excerpt: paragraphText(600, 10),
  body: richText.min(1),
  coverId: mediaId,
  /** Only null: removes a photo that is still on the old site. */
  legacyCoverPath: z.null().optional(),
  status,
  publishedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type NewsInput = z.infer<typeof newsInput>;

export const pageInput = z.object({ slug, title: line(200), intro: paragraphText(1000).nullable().optional(), body: richText, metaDescription: line(300).nullable().optional(), status });
export type PageInput = z.infer<typeof pageInput>;

export const organisationInput = z.object({
  slug: slug.optional(),
  name: line(200),
  acronym: line(30).nullable().optional(),
  website: optionalUrl,
  logoId: mediaId,
  city: line(100).nullable().optional(),
  country: countryCode.nullable().optional(),
  isPartner: z.boolean().default(false),
  partnerOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});
export type OrganisationInput = z.infer<typeof organisationInput>;

export const speakerInput = z.object({
  slug: slug.optional(),
  name: line(200),
  designation: line(200).nullable().optional(),
  organisation: line(200).nullable().optional(),
  bio: paragraphText(3000).nullable().optional(),
  website: optionalUrl,
  photoId: mediaId,
});
export type SpeakerInput = z.infer<typeof speakerInput>;

export const publicationInput = z.object({
  slug,
  title: line(400),
  abstract: paragraphText(5000, 20),
  authors: z.array(z.object({ name: line(120), affiliation: line(200).optional() })).min(1).max(50),
  area: z.enum(["ai-ml", "cybersecurity", "data-science", "software-engineering", "sustainable-technology", "emerging-technologies"]),
  type: z.enum(["Journal article", "Conference paper", "Review"]),
  venue: line(300),
  volume: line(100).nullable().optional(),
  doi: z.string().trim().regex(/^10\.\d{4,9}\/\S{1,200}$/, "Enter a DOI like 10.1234/abcd.").nullable().optional(),
  url: optionalUrl,
  pdfId: mediaId,
  keywords: z.array(line(60)).max(20).default([]),
  publishedOn: isoDate,
  featured: z.boolean().default(false),
  status,
});
export type PublicationInput = z.infer<typeof publicationInput>;

export const expertiseInput = z.object({ name: line(120), active: z.boolean().default(true) });
export const lookupInput = z.object({ kind: z.enum(["reference_style", "required_area"]), name: line(120), position: z.number().int().min(0).max(1000).default(0), active: z.boolean().default(true) });
export type LookupInput = z.infer<typeof lookupInput>;
export const lookupQuery = z.object({ kind: z.enum(["reference_style", "required_area"]).optional() });
export const albumInput = z.object({ slug, title: line(200), description: paragraphText(2000).nullable().optional(), takenOn: isoDate.nullable().optional(), status, items: z
    .array(z.object({ mediaId: z.uuid().nullable().optional(), legacyPath: z.string().regex(/^uploads\/[\w.-]{1,200}$/).nullable().optional(), caption: line(300).nullable().optional() }).refine((i) => !!i.mediaId || !!i.legacyPath, { message: "Choose a photo." }))
    .max(300)
    .default([]) });
export type AlbumInput = z.infer<typeof albumInput>;

export const contentListQuery = listQuery.extend({ status: z.enum(PUBLISH_STATUSES).optional() });
export const eventListQuery = listQuery.extend({ type: z.enum(EVENT_TYPES).optional(), when: z.enum(["upcoming", "past", "all"]).default("all") });
export const publicationQuery = listQuery.extend({
  area: z.enum(["ai-ml", "cybersecurity", "data-science", "software-engineering", "sustainable-technology", "emerging-technologies"]).optional(),
  featured: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
});
