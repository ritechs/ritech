/**
 * RiTECHS application tables. Conventions:
 * - uuid primary keys (gen_random_uuid), user references are text (Better Auth ids)
 * - timestamps with time zone; calendar dates (conference days) as `date`
 * - rich text is stored already sanitised (see apps/api/src/common/sanitize.ts)
 * - `legacy_id` keeps the ritechs.org (Laravel) id for imports and redirects
 */
import { sql, type SQL } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  char,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import {
  attendanceMode,
  campaignStatus,
  eventType,
  inboxStatus,
  lookupKind,
  mediaPurpose,
  memberStatus,
  memberType,
  publishStatus,
  quoteService,
  quoteStatus,
  registrationStatus,
  reviewStatus,
  subscriberStatus,
} from "./enums.js";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const id = () => uuid("id").primaryKey().defaultRandom();
const userRef = (name: string) => text(name).references(() => user.id, { onDelete: "set null" });

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/* --------------------------------- media --------------------------------- */

export const media = pgTable(
  "media",
  {
    id: id(),
    /** Object key in the bucket, e.g. "avatars/2026/11/<uuid>.webp". Never user-controlled. */
    storageKey: text("storage_key").notNull().unique(),
    purpose: mediaPurpose("purpose").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    originalName: text("original_name"),
    alt: text("alt"),
    isPublic: boolean("is_public").notNull().default(true),
    uploadedBy: userRef("uploaded_by"),
    createdAt: createdAt(),
  },
  (t) => [index("media_uploaded_by_idx").on(t.uploadedBy)],
);

const mediaRef = (name: string) => uuid(name).references(() => media.id, { onDelete: "set null" });

/* -------------------------------- members -------------------------------- */

export interface MemberLinks {
  orcid?: string;
  scholar?: string;
  scopus?: string;
  researchgate?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

/** A research project listed on a member's profile. */
export interface MemberProject {
  title: string;
  topic?: string;
  /** Fellow researchers on the project. */
  collaborators?: string;
  year?: string;
}

/** A conference's social media page. */
export interface SocialLink {
  network: "facebook" | "linkedin" | "twitter" | "youtube" | "instagram" | "website";
  url: string;
}

export const memberProfiles = pgTable(
  "member_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    type: memberType("type").notNull(),
    status: memberStatus("status").notNull().default("pending"),
    slug: text("slug").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gender: text("gender"),
    phoneE164: text("phone_e164"),
    position: text("position").notNull(),
    qualification: text("qualification"),
    affiliation: text("affiliation").notNull(),
    /** ISO 3166-1 alpha-2. Required for new registrations; may be unknown for imported members. */
    country: char("country", { length: 2 }),
    /** Free-text location ("Wolverhampton, UK"). */
    city: text("city"),
    bio: text("bio").notNull().default(""),
    researchField: text("research_field"),
    /** Google Scholar citation count, as the member reports it. */
    citations: integer("citations"),
    /** Public research profiles: orcid, scholar, scopus, researchgate, website. */
    links: jsonb("links").$type<MemberLinks>().notNull().default({}),
    projects: jsonb("projects").$type<MemberProject[]>().notNull().default([]),
    /** Shown instead of the type when set, e.g. "Advisor". */
    membershipLabel: text("membership_label"),
    /** Old site: the mentor a mentee asked for (legacy user id). */
    legacyMentorId: integer("legacy_mentor_id"),
    photoId: mediaRef("photo_id"),
    /** Photo path on the old site, used until the file is re-uploaded. */
    legacyPhotoPath: text("legacy_photo_path"),
    featured: boolean("featured").notNull().default(false),
    showInDirectory: boolean("show_in_directory").notNull().default(true),
    privacyAcceptedAt: ts("privacy_accepted_at").notNull(),
    reviewedBy: userRef("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    reviewNote: text("review_note"),
    legacyId: integer("legacy_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(affiliation,'') || ' ' || coalesce(position,'') || ' ' || coalesce(country,''))`,
    ),
  },
  (t) => [
    index("member_profiles_type_status_idx").on(t.type, t.status),
    index("member_profiles_directory_idx").on(t.type, t.status, t.showInDirectory, t.featured),
    index("member_profiles_search_idx").using("gin", t.search),
  ],
);

export const expertise = pgTable("expertise", {
  id: id(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const memberExpertise = pgTable(
  "member_expertise",
  {
    userId: text("user_id")
      .notNull()
      .references(() => memberProfiles.userId, { onDelete: "cascade" }),
    expertiseId: uuid("expertise_id")
      .notNull()
      .references(() => expertise.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.expertiseId] }), index("member_expertise_expertise_idx").on(t.expertiseId)],
);

export const membershipChangeRequests = pgTable(
  "membership_change_requests",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fromType: memberType("from_type").notNull(),
    toType: memberType("to_type").notNull(),
    reason: text("reason").notNull(),
    status: reviewStatus("status").notNull().default("pending"),
    reviewedBy: userRef("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    reviewNote: text("review_note"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("membership_change_one_pending_idx").on(t.userId).where(sql`status = 'pending'`),
    index("membership_change_status_idx").on(t.status, t.createdAt),
  ],
);

/* ------------------------- people and organisations ------------------------ */

export const speakers = pgTable("speakers", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  designation: text("designation"),
  organisation: text("organisation"),
  bio: text("bio"),
  website: text("website"),
  photoId: mediaRef("photo_id"),
  legacyPhotoPath: text("legacy_photo_path"),
  legacyId: integer("legacy_id").unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Universities, publishers and companies: partners on the homepage and/or conference sponsors. */
export const organisations = pgTable(
  "organisations",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    acronym: text("acronym"),
    website: text("website"),
    logoId: mediaRef("logo_id"),
    legacyLogoPath: text("legacy_logo_path"),
    city: text("city"),
    country: char("country", { length: 2 }),
    isPartner: boolean("is_partner").notNull().default(false),
    partnerOrder: smallint("partner_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    legacyId: integer("legacy_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("organisations_partner_idx").on(t.isPartner, t.active, t.partnerOrder)],
);

/* ------------------------------- conferences ------------------------------- */

export const conferences = pgTable(
  "conferences",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    acronym: text("acronym").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    objective: text("objective"),
    /** Sanitised HTML sections. */
    about: text("about"),
    joinUs: text("join_us"),
    paperSubmission: text("paper_submission"),
    /** Key facts shown at the top (publisher, indexing, workshops…). */
    highlights: text("highlights"),
    cameraReady: text("camera_ready"),
    cameraReadyUrl: text("camera_ready_url"),
    /** Shown above the fees table. */
    registrationNote: text("registration_note"),
    socialLinks: jsonb("social_links").$type<SocialLink[]>().notNull().default([]),
    publication: text("publication").array().notNull().default(sql`'{}'::text[]`),
    venue: text("venue"),
    location: text("location"),
    mode: attendanceMode("mode").notNull().default("in-person"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    timezone: text("timezone").notNull().default("Europe/London"),
    externalUrl: text("external_url"),
    submissionUrl: text("submission_url"),
    coverId: mediaRef("cover_id"),
    callForPapersId: mediaRef("call_for_papers_id"),
    /** Files still served from the old site's /uploads folder. */
    legacyCoverPath: text("legacy_cover_path"),
    legacyCallForPapersPath: text("legacy_call_for_papers_path"),
    legacyCameraReadyPath: text("legacy_camera_ready_path"),
    status: publishStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    publishedAt: ts("published_at"),
    legacyId: integer("legacy_id").unique(),
    createdBy: userRef("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("conferences_status_start_idx").on(t.status, t.startDate),
    check("conferences_dates_check", sql`${t.endDate} IS NULL OR ${t.startDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
  ],
);

const conferenceRef = () =>
  uuid("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" });
const position = () => smallint("position").notNull().default(0);

export const conferenceTracks = pgTable(
  "conference_tracks",
  {
    id: id(),
    conferenceId: conferenceRef(),
    position: position(),
    title: text("title").notNull(),
    description: text("description"),
    scope: text("scope"),
    chairs: text("chairs").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [index("conference_tracks_conf_idx").on(t.conferenceId, t.position)],
);

export const conferenceDates = pgTable(
  "conference_dates",
  {
    id: id(),
    conferenceId: conferenceRef(),
    position: position(),
    label: text("label").notNull(),
    date: date("date").notNull(),
  },
  (t) => [index("conference_dates_conf_idx").on(t.conferenceId, t.position)],
);

export const conferenceFees = pgTable(
  "conference_fees",
  {
    id: id(),
    conferenceId: conferenceRef(),
    position: position(),
    category: text("category").notNull(),
    earlyAmount: numeric("early_amount", { precision: 10, scale: 2 }),
    regularAmount: numeric("regular_amount", { precision: 10, scale: 2 }),
    onlineAmount: numeric("online_amount", { precision: 10, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    /** Fee for participants from outside the host country, when it differs. */
    overseasAmount: numeric("overseas_amount", { precision: 10, scale: 2 }),
    overseasCurrency: char("overseas_currency", { length: 3 }),
    note: text("note"),
  },
  (t) => [index("conference_fees_conf_idx").on(t.conferenceId, t.position)],
);

export const conferenceCommittee = pgTable(
  "conference_committee",
  {
    id: id(),
    conferenceId: conferenceRef(),
    position: position(),
    role: text("role").notNull(),
    members: text("members").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [index("conference_committee_conf_idx").on(t.conferenceId, t.position)],
);

export const conferenceAwards = pgTable("conference_awards", {
  id: id(),
  conferenceId: conferenceRef(),
  position: position(),
  title: text("title").notNull(),
  prize: text("prize").notNull(),
});

export const sponsorshipPackages = pgTable("sponsorship_packages", {
  id: id(),
  conferenceId: conferenceRef(),
  position: position(),
  tier: text("tier").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: char("currency", { length: 3 }).notNull().default("USD"),
  availability: text("availability"),
  benefits: text("benefits").array().notNull().default(sql`'{}'::text[]`),
});

export const conferenceSpeakers = pgTable(
  "conference_speakers",
  {
    conferenceId: conferenceRef(),
    speakerId: uuid("speaker_id")
      .notNull()
      .references(() => speakers.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("speaker"),
    position: position(),
  },
  (t) => [primaryKey({ columns: [t.conferenceId, t.speakerId] })],
);

export const conferenceSponsors = pgTable(
  "conference_sponsors",
  {
    conferenceId: conferenceRef(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    tier: text("tier"),
    position: position(),
  },
  (t) => [primaryKey({ columns: [t.conferenceId, t.organisationId] })],
);

/* --------------------------------- events -------------------------------- */

export const events = pgTable(
  "events",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    type: eventType("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    description: text("description"),
    venue: text("venue"),
    location: text("location"),
    mode: attendanceMode("mode").notNull().default("in-person"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    timezone: text("timezone").notNull().default("Europe/London"),
    /** Free-text schedule when exact times are not known ("February 1–3, 9:00 AM – 1:00 PM EST"). */
    scheduleNote: text("schedule_note"),
    fee: numeric("fee", { precision: 10, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("GBP"),
    capacity: integer("capacity"),
    registrationOpen: boolean("registration_open").notNull().default(false),
    coverId: mediaRef("cover_id"),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: ts("published_at"),
    legacyId: integer("legacy_id").unique(),
    createdBy: userRef("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_status_start_idx").on(t.status, t.startsAt),
    index("events_type_idx").on(t.type),
    check("events_capacity_check", sql`${t.capacity} IS NULL OR ${t.capacity} > 0`),
  ],
);

export const eventSpeakers = pgTable(
  "event_speakers",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    speakerId: uuid("speaker_id")
      .notNull()
      .references(() => speakers.id, { onDelete: "cascade" }),
    position: position(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.speakerId] })],
);

/** Sign-ups for an event or a conference (exactly one of the two). */
export const registrations = pgTable(
  "registrations",
  {
    id: id(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    conferenceId: uuid("conference_id").references(() => conferences.id, { onDelete: "cascade" }),
    userId: userRef("user_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phoneE164: text("phone_e164"),
    organisation: text("organisation"),
    attendance: attendanceMode("attendance"),
    notes: text("notes"),
    status: registrationStatus("status").notNull().default("pending"),
    legacyId: integer("legacy_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("registrations_target_check", sql`num_nonnulls(${t.eventId}, ${t.conferenceId}) = 1`),
    uniqueIndex("registrations_event_email_idx").on(t.eventId, t.email).where(sql`event_id IS NOT NULL`),
    uniqueIndex("registrations_conference_email_idx").on(t.conferenceId, t.email).where(sql`conference_id IS NOT NULL`),
    index("registrations_user_idx").on(t.userId),
    index("registrations_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------ publications ----------------------------- */

export interface PublicationAuthor {
  name: string;
  affiliation?: string;
}

export const publications = pgTable(
  "publications",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    abstract: text("abstract").notNull(),
    authors: jsonb("authors").$type<PublicationAuthor[]>().notNull(),
    area: text("area").notNull(),
    type: text("type").notNull(),
    venue: text("venue").notNull(),
    volume: text("volume"),
    doi: text("doi"),
    url: text("url"),
    pdfId: mediaRef("pdf_id"),
    keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
    publishedOn: date("published_on").notNull(),
    featured: boolean("featured").notNull().default(false),
    /** Demo rows exist only until real publications are imported. */
    isDemo: boolean("is_demo").notNull().default(false),
    status: publishStatus("status").notNull().default("draft"),
    createdBy: userRef("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(abstract,'')), 'B') || setweight(to_tsvector('english', coalesce(venue,'')), 'C')`,
    ),
  },
  (t) => [
    index("publications_status_date_idx").on(t.status, t.publishedOn),
    index("publications_area_idx").on(t.area),
    index("publications_search_idx").using("gin", t.search),
  ],
);

/* --------------------------- news, pages, gallery -------------------------- */

export const newsPosts = pgTable(
  "news_posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    excerpt: text("excerpt").notNull(),
    /** Sanitised HTML. */
    body: text("body").notNull(),
    coverId: mediaRef("cover_id"),
    legacyCoverPath: text("legacy_cover_path"),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: ts("published_at"),
    authorId: userRef("author_id"),
    legacyId: integer("legacy_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("news_posts_status_published_idx").on(t.status, t.publishedAt)],
);

/** Editable content blocks for the static pages (About, Mission, Procedure…). */
export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** Short text under the page title. */
  intro: text("intro"),
  /** Sanitised HTML. */
  body: text("body").notNull().default(""),
  metaDescription: text("meta_description"),
  status: publishStatus("status").notNull().default("draft"),
  /** id in the old site's pages table, for pages brought over by the legacy import. */
  legacyId: integer("legacy_id").unique(),
  updatedBy: userRef("updated_by"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const galleryAlbums = pgTable("gallery_albums", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  takenOn: date("taken_on"),
  status: publishStatus("status").notNull().default("draft"),
  legacyId: integer("legacy_id").unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const galleryItems = pgTable(
  "gallery_items",
  {
    id: id(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => galleryAlbums.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "cascade" }),
    /** Photo still served from the old site's /uploads folder. */
    legacyPath: text("legacy_path"),
    caption: text("caption"),
    position: position(),
  },
  (t) => [
    index("gallery_items_album_idx").on(t.albumId, t.position),
    check("gallery_items_source_check", sql`${t.mediaId} IS NOT NULL OR ${t.legacyPath} IS NOT NULL`),
  ],
);

/* --------------------------------- inbox --------------------------------- */

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phoneE164: text("phone_e164"),
    service: quoteService("service").notNull(),
    referenceStyle: text("reference_style"),
    wordCount: integer("word_count"),
    details: text("details").notNull(),
    status: quoteStatus("status").notNull().default("new"),
    quotedAmount: numeric("quoted_amount", { precision: 10, scale: 2 }),
    currency: char("currency", { length: 3 }).default("GBP"),
    handledBy: userRef("handled_by"),
    legacyId: integer("legacy_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("quote_requests_status_idx").on(t.status, t.createdAt)],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: inboxStatus("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull().unique(),
    status: subscriberStatus("status").notNull().default("pending"),
    /** SHA-256 of the confirmation token; the token itself is only ever emailed. */
    tokenHash: text("token_hash"),
    tokenExpiresAt: ts("token_expires_at"),
    /** SHA-256 of the long-lived unsubscribe token. */
    unsubscribeHash: text("unsubscribe_hash").notNull(),
    source: text("source"),
    confirmedAt: ts("confirmed_at"),
    unsubscribedAt: ts("unsubscribed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("newsletter_status_idx").on(t.status),
    uniqueIndex("newsletter_token_idx").on(t.tokenHash),
    uniqueIndex("newsletter_unsubscribe_idx").on(t.unsubscribeHash),
  ],
);

/* --------------------------------- email --------------------------------- */

export const mailGroups = pgTable("mail_groups", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdBy: userRef("created_by"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const mailGroupMembers = pgTable(
  "mail_group_members",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => mailGroups.id, { onDelete: "cascade" }),
    name: text("name"),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("mail_group_members_unique_idx").on(t.groupId, t.email)],
);

export interface CampaignAudience {
  memberTypes?: ("mentor" | "mentee")[];
  groupIds?: string[];
  newsletter?: boolean;
}

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: id(),
    subject: text("subject").notNull(),
    /** Sanitised HTML. */
    bodyHtml: text("body_html").notNull(),
    audience: jsonb("audience").$type<CampaignAudience>().notNull(),
    status: campaignStatus("status").notNull().default("draft"),
    recipientCount: integer("recipient_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdBy: userRef("created_by"),
    queuedAt: ts("queued_at"),
    finishedAt: ts("finished_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("email_campaigns_status_idx").on(t.status, t.createdAt)],
);

/* ------------------------------ lookups, audit ----------------------------- */

export const lookupOptions = pgTable(
  "lookup_options",
  {
    id: id(),
    kind: lookupKind("kind").notNull(),
    name: text("name").notNull(),
    position: position(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("lookup_options_kind_name_idx").on(t.kind, t.name)],
);

/** Append-only record of security-relevant and administrative actions. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** No foreign key: entries must outlive the user they describe (and the table is append-only). */
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

/* ---------------------------- member workspace ---------------------------- */
/* What mentors and mentees manage from their own dashboard (/dashboard). */

/** A short course or training a mentor offers; listed on their public profile. */
export const mentorCourses = pgTable(
  "mentor_courses",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => memberProfiles.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    duration: smallint("duration"),
    /** "hour" | "day" | "week" | "month" */
    durationUnit: text("duration_unit").notNull().default("week"),
    /** Empty or 0 means free. */
    fee: numeric("fee", { precision: 10, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("GBP"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("mentor_courses_user_idx").on(t.userId)],
);

/** A funding or grant opportunity a member shares with the community. */
export const fundingCalls = pgTable(
  "funding_calls",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => memberProfiles.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    deadline: date("deadline"),
    /** Where to read more or apply outside RiTECHS. */
    link: text("link"),
    expertiseIds: uuid("expertise_ids").array().notNull().default(sql`'{}'::uuid[]`),
    open: boolean("open").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("funding_calls_open_idx").on(t.open, t.deadline), index("funding_calls_user_idx").on(t.userId)],
);

/** A file (PDF or image) or link a member shares on their profile. */
export const memberResources = pgTable(
  "member_resources",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => memberProfiles.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    mediaId: mediaRef("media_id"),
    url: text("url"),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("member_resources_user_idx").on(t.userId)],
);

/**
 * A request from one member to another: to be mentored, to join a course,
 * or to be considered for a funding call. The recipient accepts or declines;
 * an accepted mentorship request connects the two members.
 */
export const memberRequests = pgTable(
  "member_requests",
  {
    id: id(),
    /** "mentorship" | "course" | "funding" */
    kind: text("kind").notNull(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => mentorCourses.id, { onDelete: "cascade" }),
    fundingId: uuid("funding_id").references(() => fundingCalls.id, { onDelete: "cascade" }),
    message: text("message").notNull().default(""),
    /** "pending" | "accepted" | "declined" | "withdrawn" */
    status: text("status").notNull().default("pending"),
    reply: text("reply"),
    respondedAt: ts("responded_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("member_requests_to_idx").on(t.toUserId, t.status, t.createdAt),
    index("member_requests_from_idx").on(t.fromUserId, t.createdAt),
    // One open request per person and target.
    uniqueIndex("member_requests_one_open_idx")
      .on(t.kind, t.fromUserId, t.toUserId, sql`coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid)`, sql`coalesce(funding_id, '00000000-0000-0000-0000-000000000000'::uuid)`)
      .where(sql`status IN ('pending', 'accepted')`),
    check("member_requests_kind_chk", sql`kind IN ('mentorship', 'course', 'funding')`),
    check("member_requests_status_chk", sql`status IN ('pending', 'accepted', 'declined', 'withdrawn')`),
  ],
);

/** A private message between two connected members. */
export const memberMessages = pgTable(
  "member_messages",
  {
    id: id(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("member_messages_to_idx").on(t.toUserId, t.createdAt), index("member_messages_from_idx").on(t.fromUserId, t.createdAt)],
);
