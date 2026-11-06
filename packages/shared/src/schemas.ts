import { z } from "zod";
import { richText } from "./rich-text.js";
import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js/min";
import {
  ATTENDANCE_MODES,
  BIO_MAX,
  BIO_MIN_MENTOR,
  EVENT_TYPES,
  MEMBER_TYPES,
  PASSWORD_MAX,
  PASSWORD_MIN,
  QUOTE_SERVICES,
  genders,
  positions,
  qualifications,
} from "./constants.js";

/* ----------------------------- building blocks ----------------------------- */

/** Collapses whitespace and strips control characters, so stored text is predictable. */
const clean = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Single-line text: trimmed, control characters removed, length-bounded. */
export const line = (max = 200, min = 1) =>
  z.string().transform(clean).pipe(z.string().min(min, "This field is required.").max(max, `Use ${max} characters or fewer.`));

/** Multi-line plain text (paragraphs kept). */
export const paragraphText = (max = 5000, min = 0) =>
  z
    .string()
    // eslint-disable-next-line no-control-regex
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .pipe(z.string().min(min).max(max, `Use ${max} characters or fewer.`));

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter an email address like name@university.edu."));

export const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include at least one letter and one number.");

export const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Select your country.");

export const httpsUrl = z
  .url({ protocol: /^https?$/, hostname: z.regexes.domain })
  .max(2048);

export const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Use letters, numbers and hyphens only.");

export const isoDate = z.iso.date();

export const phone = z
  .object({ country: countryCode, number: z.string().trim().min(4).max(32) })
  .refine((p) => isValidPhoneNumber(p.number, p.country as CountryCode), {
    message: "Enter a valid phone number for the selected country.",
    path: ["number"],
  });

/* ------------------------------ auth & members ----------------------------- */

const memberBase = z.object({
  firstName: line(80),
  lastName: line(80),
  email,
  phone,
  gender: z.enum(genders, { error: "Select your gender." }),
  affiliation: line(200),
  country: countryCode,
  password,
  privacy: z.literal(true, { error: "Accept the RiTECHS Privacy Policy to register." }),
});

export const mentorRegistrationSchema = memberBase.extend({
  type: z.literal("mentor"),
  position: z.enum(positions.mentor as [string, ...string[]], { error: "Select your current position." }),
  qualification: z.enum(qualifications.mentor as [string, ...string[]], { error: "Select your highest qualification." }),
  bio: richText(BIO_MAX, BIO_MIN_MENTOR),
});

export const menteeRegistrationSchema = memberBase.extend({
  type: z.literal("mentee"),
  position: z.enum(positions.mentee as [string, ...string[]], { error: "Select your current position." }),
  qualification: z.enum(qualifications.mentee as [string, ...string[]], { error: "Select your highest qualification." }),
  bio: richText(BIO_MAX).optional().default(""),
});

export const memberRegistrationSchema = z.discriminatedUnion("type", [mentorRegistrationSchema, menteeRegistrationSchema]);
export type MemberRegistration = z.infer<typeof memberRegistrationSchema>;

export const memberTypeSchema = z.enum(MEMBER_TYPES);

/** Fields a member may edit on their own profile (email, type and status are not here). */
/** Research and social profile links a member can show on their page. */
export const MEMBER_LINK_KEYS = ["scholar", "scopus", "orcid", "researchgate", "website", "linkedin", "twitter", "facebook", "instagram"] as const;
export type MemberLinkKey = (typeof MEMBER_LINK_KEYS)[number];
export const PROFILE_BIO_MAX = 4000;

/** A profile link: an http(s) address, an ORCID iD (turned into its URL), or "" to remove it. */
const profileLink = z
  .string()
  .trim()
  .max(2048)
  .transform((v) => (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(v) ? `https://orcid.org/${v.toUpperCase()}` : v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.union([z.literal(""), httpsUrl], { error: "Enter a web address like https://example.org/profile." }));

export const profileUpdateSchema = z
  .object({
    firstName: line(80),
    lastName: line(80),
    phone,
    affiliation: line(200),
    country: countryCode,
    position: line(80),
    qualification: line(80),
    bio: richText(PROFILE_BIO_MAX),
    expertiseIds: z.array(z.uuid()).max(12),
    showInDirectory: z.boolean(),
    city: line(120, 0),
    researchField: line(200, 0),
    citations: z.number().int().min(0).max(10_000_000).nullable(),
    links: z.object(Object.fromEntries(MEMBER_LINK_KEYS.map((k) => [k, profileLink])) as Record<MemberLinkKey, typeof profileLink>).partial(),
  })
  .partial();

export const membershipChangeSchema = z.object({
  toType: z.enum(MEMBER_TYPES),
  reason: richText(1000, 10),
});

/* ------------------------------- public forms ------------------------------ */

export const newsletterSchema = z.object({
  email,
  /** Honeypot: real people never fill this in. */
  website: z.string().max(0).optional(),
});

export const contactSchema = z.object({
  name: line(120),
  email,
  subject: line(160),
  message: richText(5000, 10),
  website: z.string().max(0).optional(),
});

export const quoteRequestSchema = z.object({
  name: line(120),
  email,
  phone: phone.optional(),
  service: z.enum(QUOTE_SERVICES),
  referenceStyle: line(60).optional(),
  wordCount: z.number().int().min(0).max(500_000).optional(),
  details: paragraphText(5000, 10),
  website: z.string().max(0).optional(),
});

export const eventRegistrationSchema = z.object({
  name: line(120),
  email,
  phone: phone.optional(),
  organisation: line(200).optional(),
  attendance: z.enum(ATTENDANCE_MODES).optional(),
  notes: paragraphText(1000).optional(),
  website: z.string().max(0).optional(),
});

/* ---------------------------------- lists ---------------------------------- */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
});

export const eventTypeSchema = z.enum(EVENT_TYPES);

/* ---------------------------- member workspace ---------------------------- */

export const memberProjectSchema = z.object({
  title: line(200),
  topic: line(200, 0).optional(),
  collaborators: line(300, 0).optional(),
  year: z.string().trim().regex(/^(19|20)\d{2}$|^$/, "Enter a year like 2024.").optional(),
});
export const memberProjectsSchema = z.object({ projects: z.array(memberProjectSchema).max(50, "You can list up to 50 projects.") });

export const COURSE_UNITS = ["hour", "day", "week", "month"] as const;
export const mentorCourseSchema = z.object({
  title: line(200),
  description: richText(3000),
  duration: z.number().int().min(1).max(1000).nullable(),
  durationUnit: z.enum(COURSE_UNITS),
  fee: z.number().min(0).max(1_000_000).nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Choose a currency."),
  active: z.boolean(),
});

export const fundingCallSchema = z.object({
  title: line(200),
  description: richText(5000),
  deadline: isoDate.nullable(),
  link: z.union([z.literal(""), httpsUrl]).nullable(),
  expertiseIds: z.array(z.uuid()).max(12),
  open: z.boolean(),
});

export const resourceLinkSchema = z.object({ title: line(200), url: httpsUrl });

export const REQUEST_KINDS = ["mentorship", "course", "funding"] as const;
export const memberRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mentorship"), mentor: slug, message: richText(2000, 10) }),
  z.object({ kind: z.literal("course"), courseId: z.uuid(), message: richText(2000) }),
  z.object({ kind: z.literal("funding"), fundingId: z.uuid(), message: richText(2000, 10) }),
]);
export const requestResponseSchema = z.object({ status: z.enum(["accepted", "declined", "withdrawn"]), reply: richText(2000).optional() });

export const memberMessageSchema = z.object({
  to: z.array(z.string().min(1).max(64)).min(1, "Choose who to send it to.").max(50),
  subject: line(200),
  body: richText(5000, 1),
});

/** A member writing to the RiTECHS team from their dashboard (arrives in Admin → Inbox). */
export const supportMessageSchema = z.object({ subject: line(160), message: richText(5000, 10) });
