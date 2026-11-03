/**
 * One-off import of the old ritechs.org (Laravel/MariaDB) database.
 *
 *   npm run legacy:import -- --file ritechs_db.sql            # dry run: report only
 *   npm run legacy:import -- --file ritechs_db.sql --apply    # write to DATABASE_URL
 *
 * Safe to re-run: every row is matched by its old id (`legacy_id`) or a natural
 * key, and existing passwords are never overwritten. Old bcrypt hashes are kept
 * as they are; each member's hash is upgraded on their first sign-in.
 *
 * Imported: members (with expertise, social links and research projects),
 * conferences with every section (tracks, dates, fees, committees, speakers,
 * sponsors, files), events and their registrations, news (blogs), the photo
 * gallery, quote requests, mailing groups, speakers and organisations.
 *
 * The old CMS pages come over as drafts (Admin → Website Pages); the website
 * keeps its designed pages until staff publish an edited version.
 *
 * Not imported on purpose: the 3 old admin accounts and the "Conference"
 * logins (create staff with `admin:create`); and the unfinished member
 * features that only hold developer test records (courses, fundings,
 * private messages, service requests, uploaded test files).
 */
import "reflect-metadata";
import { createDb, createPool, schema, type Database, type MemberLinks, type MemberProject, type SocialLink } from "@ritechs/db";
import { and, eq, sql } from "drizzle-orm";
import { isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { sanitizeRichText } from "../common/sanitize.js";
import { slugify } from "../common/slug.js";
import { readDump, type Row } from "./mysql-dump.js";

/* ------------------------------- helpers -------------------------------- */

const str = (v: unknown) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const opt = (v: unknown) => str(v) || null;
const date = (v: unknown) => {
  const s = str(v);
  if (!s || s.startsWith("0000")) return null;
  const d = new Date(`${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOREM = /\b(lorem|ipsum|dolorum|voluptat|quibusdam|minima odio|voluptatem)\b/i;

/** Country from free text ("Wolverhampton, West Midlands" → GB). Unknown → null. */
const COUNTRY_WORDS: [RegExp, string][] = [
  [/\b(uk|u\.k\.|united kingdom|england|scotland|wales|britain|wolverhampton|wolverhanpton|birmingham|walsall|cardiff|edinburgh|bournemouth|reading|kettering|leeds|london|west midlands)\b/i, "GB"],
  [/\b(usa|u\.s\.a|u\.s\.|united states|oklahoma|ny|new york)\b/i, "US"],
  [/\b(bangladesh|dhaka|chittagong|chattagram|khulna|sylhet|kumira|jigatola)\b/i, "BD"],
  [/\b(malaysia|kuantan|pahang|selangor|bangi|gombak|pekan)\b/i, "MY"],
  [/\b(india|andhra pradesh|amaravati|vijayawada|kanpur|ranchi)\b/i, "IN"],
  [/\b(china|zhenjiang)\b/i, "CN"],
  [/\b(hong ?kong)\b/i, "HK"],
  [/\b(japan|kyoto|okazaki)\b/i, "JP"],
  [/\b(iraq|baghdad|duhok|sulaimani)\b/i, "IQ"],
  [/\b(yemen|sana)\b/i, "YE"],
  [/\b(vietnam|ho chi minh)\b/i, "VN"],
  [/\b(australia|sydney|canberra)\b/i, "AU"],
  [/\b(canada|quebec)\b/i, "CA"],
  [/\b(italy|naples)\b/i, "IT"],
  [/\b(spain)\b/i, "ES"], [/\b(portugal)\b/i, "PT"], [/\b(belgium)\b/i, "BE"], [/\b(netherlands)\b/i, "NL"],
  [/\b(ireland)\b/i, "IE"], [/\b(germany)\b/i, "DE"], [/\b(france)\b/i, "FR"],
  [/\b(nigeria)\b/i, "NG"], [/\b(uganda)\b/i, "UG"], [/\b(lesotho)\b/i, "LS"], [/\b(madagascar)\b/i, "MG"], [/\b(morocco)\b/i, "MA"],
  [/\b(pakistan)\b/i, "PK"], [/\b(singapore)\b/i, "SG"], [/\b(brunei)\b/i, "BN"], [/\b(qatar)\b/i, "QA"], [/\b(kuwait)\b/i, "KW"],
  [/\b(saudi)\b/i, "SA"], [/\b(united arab emirates|uae|dubai|ajman)\b/i, "AE"],
  [/\b(brazil)\b/i, "BR"], [/\b(bolivia)\b/i, "BO"], [/\b(venezuela)\b/i, "VE"], [/\b(nicaragua)\b/i, "NI"], [/\b(saint lucia)\b/i, "LC"],
];
export const countryFrom = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  for (const [re, code] of COUNTRY_WORDS) if (re.test(s)) return code;
  return null;
};

const phoneE164 = (raw: unknown, country: string | null) => {
  const s = str(raw).replace(/[^\d+]/g, "");
  if (s.length < 7) return null;
  const p = s.startsWith("+") ? parsePhoneNumberFromString(s) : country ? parsePhoneNumberFromString(s, country as CountryCode) : null;
  return p && isValidPhoneNumber(p.number) ? p.number : null;
};

const TITLE = /(professor|lecturer|researcher|fellow|director|dean|student|scientist|engineer|manager|officer|head|chair)/i;
function qualificationOf(v: unknown) {
  const s = str(v);
  if (!s) return null;
  if (/ph\.?\s?d/i.test(s)) return "Ph.D.";
  if (/master/i.test(s)) return "Masters";
  if (/bachelor/i.test(s)) return "Bachelor";
  return TITLE.test(s) ? null : s;
}

const url = (v: unknown) => {
  const s = str(v).replace(/\s+/g, "");
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(s) ? s.slice(0, 500) : null;
};
function linksOf(d: Row): MemberLinks {
  const links: MemberLinks = {};
  const orcid = str(d.orcid_id).match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i)?.[0];
  if (orcid) links.orcid = `https://orcid.org/${orcid.toUpperCase()}`;
  const rg = url(d.reasearchgate_link);
  if (rg) links.researchgate = rg;
  const scopus = url(d.scopus_link);
  if (scopus) links.scopus = scopus;
  const scholar = url(d.rs_link) ?? url(d.gscholar_citation_number);
  if (scholar && /scholar\.google/i.test(scholar)) links.scholar = scholar;
  else if (scholar) links.website = scholar;
  return links;
}

const splitName = (first: string, last: string) => {
  if (last) return [first, last] as const;
  const parts = first.split(" ");
  return parts.length > 1 ? ([parts.slice(0, -1).join(" "), parts.at(-1)!] as const) : ([first, ""] as const);
};

/* -------------------------------- import -------------------------------- */

/** An account we created on an earlier run still carries the old hash (or was upgraded by its owner signing in). */
async function isSameImportedAccount(db: Database, userId: string, legacyHash: string) {
  const [a] = await db.select({ password: schema.account.password }).from(schema.account).where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential"))).limit(1);
  if (a?.password === legacyHash) return true;
  const [log] = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(and(eq(schema.auditLogs.action, "legacy.account_created"), eq(schema.auditLogs.entityId, userId))).limit(1);
  return !!log;
}

interface Report {
  counts: Record<string, number>;
  notes: string[];
}

async function importMembers(db: Database, t: Map<string, Row[]>, r: Report) {
  const users = t.get("users") ?? [];
  const details = new Map((t.get("user_details") ?? []).map((d) => [Number(d.user_id), d]));
  const expertiseNames = new Map((t.get("expertises") ?? []).map((e) => [Number(e.id), str(e.name)]));
  const userExpertise = new Map<number, number[]>();
  for (const ue of t.get("user_expertises") ?? []) userExpertise.set(Number(ue.user_id), [...(userExpertise.get(Number(ue.user_id)) ?? []), Number(ue.expertise_id)]);

  // Expertise topics: union of old and existing.
  for (const name of new Set(expertiseNames.values())) {
    if (name) await db.insert(schema.expertise).values({ name, slug: slugify(name) }).onConflictDoNothing();
  }
  const expertiseIdBySlug = new Map((await db.select({ id: schema.expertise.id, slug: schema.expertise.slug }).from(schema.expertise)).map((e) => [e.slug, e.id]));

  for (const u of users) {
    const legacyId = Number(u.id);
    const kind = str(u.user_type);
    if (kind === "admin" || kind === "Conference") {
      r.counts[`skipped_${kind.toLowerCase()}_accounts`] = (r.counts[`skipped_${kind.toLowerCase()}_accounts`] ?? 0) + 1;
      continue;
    }
    const email = str(u.email).toLowerCase();
    if (!EMAIL.test(email)) {
      r.notes.push(`user ${legacyId}: invalid email, skipped`);
      continue;
    }
    const d = details.get(legacyId);
    const status = d ? ({ 1: "pending", 2: "approved", 3: "rejected" } as const)[Number(d.account_status) as 1 | 2 | 3] ?? "pending" : null;
    const [firstName, lastName] = splitName(str(d?.name) || str(u.name), str(d?.last_name) || str(u.last_name));
    const suspicious = LOREM.test(`${firstName} ${lastName} ${str(d?.location)} ${str(d?.affiliation)}`);
    if (suspicious) r.notes.push(`user ${legacyId}: looks like test/spam data (lorem ipsum) — review and delete in Admin → Members`);

    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`).limit(1);
      const [linked] = await tx.select({ userId: schema.memberProfiles.userId }).from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, legacyId)).limit(1);
      let userId: string;
      if (linked) {
        userId = linked.userId; // re-run: refresh profile fields below, keep account and password
      } else if (existing && (await isSameImportedAccount(tx as unknown as Database, existing.id, str(u.password)))) {
        userId = existing.id; // imported earlier (account without a profile)
      } else if (existing) {
        r.notes.push(`user ${legacyId}: email already registered on the new site, skipped`);
        r.counts.conflicts = (r.counts.conflicts ?? 0) + 1;
        return;
      } else {
        userId = randomUUID();
        const created = date(u.created_at) ?? new Date();
        await tx.insert(schema.user).values({
          id: userId,
          name: `${firstName} ${lastName}`.trim() || email,
          email,
          // Approved members were vetted and used their accounts; others confirm their email first.
          emailVerified: status === "approved",
          role: "user",
          createdAt: created,
          updatedAt: date(u.updated_at) ?? created,
        });
        await tx.insert(schema.account).values({ id: randomUUID(), accountId: userId, providerId: "credential", userId, password: str(u.password), createdAt: created, updatedAt: new Date() });
        await tx.insert(schema.auditLogs).values({ action: "legacy.account_created", entityType: "user", entityId: userId, metadata: { legacyId } });
        r.counts.accounts = (r.counts.accounts ?? 0) + 1;
      }

      if (!d) {
        r.counts.accounts_without_profile = (r.counts.accounts_without_profile ?? 0) + 1;
        return;
      }
      const country = countryFrom(d.location);
      const location = str(d.location);
      const title = str(d.designation);
      const edu = str(d.highest_education);
      const values = {
        type: (str(d.user_type) === "Mentee" ? "mentee" : "mentor") as "mentor" | "mentee",
        status: status!,
        firstName,
        lastName,
        gender: ["Male", "Female"].includes(str(d.gender)) ? str(d.gender) : null,
        phoneE164: phoneE164(d.phone, country),
        position: title || (TITLE.test(edu) ? edu : ""),
        qualification: qualificationOf(edu),
        affiliation: str(d.affiliation),
        country,
        city: location && !/^\d+$/.test(location) && !LOREM.test(location) ? location.replace(/[.,\s]+$/, "") : null,
        bio: str(d.biography).length ? String(d.biography).trim() : "",
        researchField: opt(d.filed_of_research),
        links: linksOf(d),
        membershipLabel: str(d.mentor_status) === "Advisor" ? "Advisor" : null,
        legacyMentorId: d.mentees_mentor ? Number(d.mentees_mentor) : null,
        legacyPhotoPath: d.image ? `uploads/${str(d.image)}` : null,
        featured: Number(d.popular_mentor) === 1,
        privacyAcceptedAt: date(d.created_at) ?? date(u.created_at) ?? new Date(),
        reviewedAt: status === "pending" ? null : (date(d.updated_at) ?? null),
        legacyId,
      };
      await tx
        .insert(schema.memberProfiles)
        .values({ ...values, userId, slug: `${slugify(`${firstName}-${lastName}`)}-${legacyId}`, createdAt: date(d.created_at) ?? undefined })
        .onConflictDoUpdate({ target: schema.memberProfiles.userId, set: values });
      r.counts[`${values.type}s_${values.status}`] = (r.counts[`${values.type}s_${values.status}`] ?? 0) + 1;
      if (!country && location) r.counts.unknown_country = (r.counts.unknown_country ?? 0) + 1;

      await tx.delete(schema.memberExpertise).where(eq(schema.memberExpertise.userId, userId));
      const ids = [...new Set((userExpertise.get(legacyId) ?? []).map((e) => expertiseIdBySlug.get(slugify(expertiseNames.get(e) ?? ""))).filter((x): x is string => !!x))];
      if (ids.length) await tx.insert(schema.memberExpertise).values(ids.map((expertiseId) => ({ userId, expertiseId })));
    });
  }

  // Pending "Mentee → Mentor" requests. (Advisor upgrades are already reflected in the label.)
  for (const c of t.get("membership_changes") ?? []) {
    const to = str(c.expected_user_type).toLowerCase();
    if (Number(c.status) !== 1 || (to !== "mentor" && to !== "mentee")) continue;
    const [p] = await db.select({ userId: schema.memberProfiles.userId, type: schema.memberProfiles.type }).from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, Number(c.user_id)));
    if (!p || p.type === to) continue;
    await db
      .insert(schema.membershipChangeRequests)
      .values({ userId: p.userId, fromType: p.type, toType: to as "mentor", reason: str(c.instruction) || "Requested on the old site", createdAt: date(c.created_at) ?? new Date() })
      .onConflictDoNothing();
    r.counts.membership_change_requests = (r.counts.membership_change_requests ?? 0) + 1;
  }
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** "28th March 2024 | 9:30 AM - 1:00 PM GMT" → start/end in UTC (GMT/UK winter). */
function scheduleOf(text: string): { startsAt: Date | null; endsAt: Date | null } {
  const m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})/i);
  const month = m ? MONTHS.indexOf(m[2]!.toLowerCase()) : -1;
  if (!m || month < 0) return { startsAt: null, endsAt: null };
  const times = [...text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)?/gi)].map((t) => {
    let h = Number(t[1]);
    if (t[3]?.toUpperCase() === "PM" && h < 12) h += 12;
    if (t[3]?.toUpperCase() === "AM" && h === 12) h = 0;
    return [h, Number(t[2])] as const;
  });
  const at = (hm?: readonly [number, number]) => new Date(Date.UTC(Number(m[3]), month, Number(m[1]), hm?.[0] ?? 9, hm?.[1] ?? 0));
  return { startsAt: at(times[0]), endsAt: times[1] ? at(times[1]) : null };
}

async function importEvents(db: Database, t: Map<string, Row[]>, r: Report) {
  const eventIds = new Map<number, string>();
  for (const e of t.get("events") ?? []) {
    const legacyId = Number(e.id);
    const kind = str(e.type).toLowerCase();
    const type = kind.includes("seminar") ? "seminar" : kind.includes("adda") ? "research-adda" : kind.includes("boot") ? "bootcamp" : "cyber4me";
    const title = str(e.subject);
    const scheduleNote = /^tba$/i.test(str(e.duration)) ? "To be announced" : str(e.duration).replace(/\s*\|\s*/g, ", ");
    const { startsAt, endsAt } = scheduleOf(str(e.duration));
    const values = {
      type: type as "seminar",
      title,
      summary: str(e.description).slice(0, 1000) || null,
      description: e.description ? sanitizeRichText(`<p>${String(e.description).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n+/g, "</p><p>")}</p>`) : null,
      location: opt(e.location),
      mode: (/online/i.test(`${e.location} ${e.type}`) ? "online" : "in-person") as "online",
      startsAt,
      endsAt,
      scheduleNote: scheduleNote || null,
      fee: Number(e.fee) > 0 ? String(e.fee) : "0",
      currency: (str(e.currency).toUpperCase().match(/^[A-Z]{3}$/)?.[0] ?? "GBP"),
      registrationOpen: false,
      status: Number(e.status) === 1 ? ("published" as const) : ("draft" as const),
      publishedAt: date(e.created_at),
      legacyId,
    };
    const [row] = await db
      .insert(schema.events)
      .values({ ...values, slug: `${slugify(title)}-${legacyId}`, createdAt: date(e.created_at) ?? undefined })
      .onConflictDoUpdate({ target: schema.events.legacyId, set: values })
      .returning({ id: schema.events.id });
    eventIds.set(legacyId, row!.id);
    r.counts.events = (r.counts.events ?? 0) + 1;
  }

  for (const q of t.get("event_requests") ?? []) {
    const eventId = eventIds.get(Number(q.event_id));
    const email = str(q.email).toLowerCase();
    if (!eventId || !EMAIL.test(email)) {
      r.counts.registrations_skipped = (r.counts.registrations_skipped ?? 0) + 1;
      continue;
    }
    const rows = await db
      .insert(schema.registrations)
      .values({
        eventId,
        name: str(q.name) || email,
        email,
        phoneE164: phoneE164(q.phone, "GB"),
        organisation: opt(q.organization),
        notes: opt(q.instruction),
        status: "confirmed",
        legacyId: Number(q.id),
        createdAt: date(q.created_at) ?? new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: schema.registrations.id });
    r.counts[rows.length ? "registrations" : "registrations_duplicates"] = (r.counts[rows.length ? "registrations" : "registrations_duplicates"] ?? 0) + 1;
  }
}

async function importInboxAndLists(db: Database, t: Map<string, Row[]>, r: Report) {
  const styles = new Map((t.get("reference_styles") ?? []).map((s) => [Number(s.id), str(s.name)]));
  for (const [kind, table] of [["reference_style", "reference_styles"], ["required_area", "required_areas"]] as const) {
    for (const [i, row] of (t.get(table) ?? []).entries())
      await db.insert(schema.lookupOptions).values({ kind, name: str(row.name), position: i, active: Number(row.status) === 1 }).onConflictDoNothing();
  }
  const areas = new Map((t.get("required_areas") ?? []).map((s) => [Number(s.id), str(s.name)]));

  for (const q of t.get("get_quotes") ?? []) {
    const service = str(q.service_type).toLowerCase();
    const amount = Number(q.amount) > 0 ? String(q.amount) : null;
    const details = [str(q.instruction), areas.get(Number(q.required_area_id)) && `Subject area: ${areas.get(Number(q.required_area_id))}`, q.file && `Document uploaded on the old site: uploads/${str(q.file)}`, q.date && `Needed by: ${str(q.date)}`]
      .filter(Boolean)
      .join("\n");
    await db
      .insert(schema.quoteRequests)
      .values({
        name: str(q.name),
        email: str(q.email).toLowerCase(),
        phoneE164: phoneE164(q.phone, null),
        service: (["editing", "proofreading", "formatting", "poster", "training"].includes(service) ? service : "other") as "editing",
        referenceStyle: styles.get(Number(q.reference_style_id)) ?? null,
        wordCount: Number(q.document_size) || null,
        details: details || "Imported from the old site",
        status: amount ? "quoted" : "new",
        quotedAmount: amount,
        legacyId: Number(q.id),
        createdAt: date(q.created_at) ?? new Date(),
      })
      .onConflictDoNothing();
    r.counts.quote_requests = (r.counts.quote_requests ?? 0) + 1;
  }

  const groupIds = new Map<number, string>();
  for (const g of t.get("mail_group") ?? []) {
    const name = str(g.name) || `Group ${g.id}`;
    await db.insert(schema.mailGroups).values({ name, description: opt(g.description), createdAt: date(g.created_at) ?? undefined }).onConflictDoNothing();
    const [row] = await db.select({ id: schema.mailGroups.id }).from(schema.mailGroups).where(eq(schema.mailGroups.name, name));
    groupIds.set(Number(g.id), row!.id);
  }
  r.counts.mail_groups = groupIds.size;
  const members = (t.get("mail_group_emails") ?? [])
    .map((m) => ({ groupId: groupIds.get(Number(m.mail_group_id)), email: str(m.email).toLowerCase(), name: opt(m.name) }))
    .filter((m): m is { groupId: string; email: string; name: string | null } => !!m.groupId && EMAIL.test(m.email));
  for (let i = 0; i < members.length; i += 500) await db.insert(schema.mailGroupMembers).values(members.slice(i, i + 500)).onConflictDoNothing();
  r.counts.mail_group_addresses = members.length;
}

async function importPeopleAndOrgs(db: Database, t: Map<string, Row[]>, r: Report) {
  for (const s of t.get("speakers") ?? []) {
    const name = str(s.name);
    if (!name) continue;
    const bio = [str(s.qualification), str(s.expertise) && `Expertise: ${str(s.expertise)}`, str(s.research) && `Research: ${str(s.research)}`].filter(Boolean).join("\n\n");
    const values = { name, designation: opt(s.designation), organisation: opt([str(s.faculty), str(s.school), str(s.institute)].filter(Boolean).join(", ")), bio: bio || null, website: url(s.link), legacyPhotoPath: s.file ? `uploads/${str(s.file)}` : null, legacyId: Number(s.id) };
    // Speakers already created from the website content are matched by name.
    const [byName] = await db.select({ id: schema.speakers.id }).from(schema.speakers).where(and(sql`lower(${schema.speakers.name}) = ${name.toLowerCase()}`, sql`${schema.speakers.legacyId} IS NULL`)).limit(1);
    if (byName) await db.update(schema.speakers).set(values).where(eq(schema.speakers.id, byName.id));
    else await db.insert(schema.speakers).values({ ...values, slug: `${slugify(name)}-${s.id}` }).onConflictDoUpdate({ target: schema.speakers.legacyId, set: values });
    r.counts.speakers = (r.counts.speakers ?? 0) + 1;
  }
  for (const o of t.get("sponsors") ?? []) {
    const name = str(o.name);
    if (!name) continue;
    const active = Number(o.status) === 1;
    // The old homepage showed every active sponsor in its "Trusted Partners" strip.
    const values = { name, acronym: opt(o.acronym), website: url(o.website), city: opt(o.city), country: countryFrom(o.country), legacyLogoPath: o.logo ? `uploads/${str(o.logo)}` : null, active, legacyId: Number(o.id) };
    const slug = slugify(name);
    const [bySlug] = await db.select({ id: schema.organisations.id }).from(schema.organisations).where(eq(schema.organisations.slug, slug)).limit(1);
    // An organisation is never taken out of the partner strip by the import (staff may have chosen it).
    const isPartner = sql`${schema.organisations.isPartner} OR ${active}`;
    if (bySlug) await db.update(schema.organisations).set({ ...values, isPartner, legacyLogoPath: sql`coalesce(${schema.organisations.legacyLogoPath}, ${values.legacyLogoPath})` }).where(eq(schema.organisations.id, bySlug.id));
    else await db.insert(schema.organisations).values({ ...values, slug, isPartner: active, partnerOrder: 100 + Number(o.id) }).onConflictDoUpdate({ target: schema.organisations.legacyId, set: { ...values, isPartner } });
    r.counts.organisations = (r.counts.organisations ?? 0) + 1;
  }
}

/* ------------------------- social links & projects ------------------------ */

const SOCIAL_HOSTS: [RegExp, keyof MemberLinks][] = [
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)(twitter|x)\.com$/, "twitter"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
];
/** A profile URL on a known network, classified by its host (the old icon field is unreliable). Bare home pages are dropped. */
export function socialLinkOf(raw: unknown): [keyof MemberLinks, string] | null {
  const u = url(raw);
  if (!u) return null;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || /^\/(feed|home|login)$/i.test(path)) return null;
  const host = parsed.hostname.toLowerCase();
  const kind = SOCIAL_HOSTS.find(([re]) => re.test(host))?.[1];
  return kind ? [kind, `https://${host.replace(/^(m|mobile)\./, "www.")}${path}`] : null;
}

const TEST_TITLE = /^(test\b|my (first )?project$|php$|laravel$|\d+$|hello$)/i;

async function importMemberExtras(db: Database, t: Map<string, Row[]>, r: Report) {
  const social = new Map<number, MemberLinks>();
  for (const s of t.get("social_links") ?? []) {
    const link = socialLinkOf(s.url);
    if (!link) continue;
    const links = social.get(Number(s.user_id)) ?? {};
    links[link[0]] ??= link[1];
    social.set(Number(s.user_id), links);
  }
  const projects = new Map<number, MemberProject[]>();
  for (const p of t.get("projects") ?? []) {
    const title = str(p.title);
    // Real research projects have descriptive titles; the rest are developer tests.
    if (TEST_TITLE.test(title) || title.split(" ").length < 3) continue;
    const list = projects.get(Number(p.user_id)) ?? [];
    list.push({ title, ...(opt(p.topics) ? { topic: str(p.topics) } : {}), ...(/^\d{4}$/.test(str(p.year)) ? { year: str(p.year) } : {}) });
    projects.set(Number(p.user_id), list);
  }
  for (const legacyId of new Set([...social.keys(), ...projects.keys()])) {
    const [p] = await db.select({ userId: schema.memberProfiles.userId, links: schema.memberProfiles.links }).from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, legacyId)).limit(1);
    if (!p) continue;
    const set: { links?: MemberLinks; projects?: MemberProject[] } = {};
    if (social.has(legacyId)) {
      set.links = { ...social.get(legacyId), ...p.links };
      r.counts.members_with_social_links = (r.counts.members_with_social_links ?? 0) + 1;
    }
    if (projects.has(legacyId)) {
      set.projects = projects.get(legacyId)!.sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
      r.counts.member_projects = (r.counts.member_projects ?? 0) + set.projects.length;
    }
    await db.update(schema.memberProfiles).set(set).where(eq(schema.memberProfiles.userId, p.userId));
  }
}

/* ------------------------------- conferences ------------------------------ */

const webUrl = (v: unknown) => {
  const s = str(v).replace(/\s+/g, "");
  return url(/^www\./i.test(s) ? `https://${s}` : s);
};
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Old fields mix plain text (newlines) and editor HTML; empty editor output ("<p>&nbsp;</p>") counts as nothing. */
export function htmlOf(v: unknown): string | null {
  const raw = v == null ? "" : String(v).trim();
  const text = raw.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "");
  if (!text || /^(n\/?a|tbc|vv)$/i.test(text)) return null;
  const html = /<[a-z][\s\S]*>/i.test(raw)
    ? raw
    : raw
        .split(/\r?\n\s*\r?\n|\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${esc(p)}</p>`)
        .join("");
  return sanitizeRichText(html);
}
const plain = (v: unknown) => str(String(v ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
const keyOf = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
const CURRENCY = (v: unknown, fallback: string) => str(v).toUpperCase().match(/^[A-Z]{3}$/)?.[0] ?? fallback;
const SOCIAL_ICON: Record<string, SocialLink["network"]> = { "fa-facebook": "facebook", "fa-facebook-f": "facebook", "fa-linkedin": "linkedin", "fa-linkedin-in": "linkedin", "fa-twitter": "twitter", "fa-youtube": "youtube", "fa-instagram": "instagram" };

/** "a /b / c" → items; long segments are sentences of one description, short ones are topics. */
export function trackOf(title: string, description: unknown) {
  const parts = str(description).split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return { title, description: null, scope: null };
  const avg = parts.reduce((n, x) => n + x.length, 0) / parts.length;
  return avg > 70 ? { title, description: parts.join(" "), scope: null } : { title, description: null, scope: parts.join("; ") };
}

async function importConferences(db: Database, t: Map<string, Row[]>, r: Report) {
  const byConf = (table: string) => {
    const m = new Map<number, Row[]>();
    for (const row of t.get(table) ?? []) m.set(Number(row.conference_id), [...(m.get(Number(row.conference_id)) ?? []), row]);
    return m;
  };
  const prices = byConf("conference_prices"), schedules = byConf("conference_schedules"), tracks = byConf("mejor_tracks"), committees = byConf("organising_committees");
  const socials = byConf("conference_socials"), confSpeakers = byConf("conference_speakers"), confSponsors = byConf("conference_sponsors");
  const speakerIds = new Map((await db.select({ id: schema.speakers.id, legacyId: schema.speakers.legacyId }).from(schema.speakers)).filter((x) => x.legacyId != null).map((x) => [x.legacyId!, x.id]));
  const orgIds = new Map((await db.select({ id: schema.organisations.id, legacyId: schema.organisations.legacyId }).from(schema.organisations)).filter((x) => x.legacyId != null).map((x) => [x.legacyId!, x.id]));
  const existing = await db.select({ id: schema.conferences.id, slug: schema.conferences.slug, legacyId: schema.conferences.legacyId }).from(schema.conferences);

  for (const c of t.get("conferences") ?? []) {
    const legacyId = Number(c.id);
    const oldSlug = str(c.slug) || str(c.subject).replace(/\s+/g, "");
    const match = existing.find((e) => e.legacyId === legacyId) ?? existing.find((e) => keyOf(e.slug) === keyOf(oldSlug));
    const about = htmlOf(c.about);
    const fullTitle = str(c.subject_description) || str(c.crpp_title) || str(c.subject);
    const values = {
      acronym: str(c.subject),
      title: fullTitle,
      highlights: htmlOf(c.description),
      about,
      joinUs: htmlOf(c.join_us),
      paperSubmission: htmlOf(c.paper_submission),
      cameraReady: htmlOf(c.camera_paper_submission),
      cameraReadyUrl: webUrl(c.crp_submission_link),
      registrationNote: htmlOf(c.price_description) ? plain(c.price_description) : null,
      submissionUrl: webUrl(c.sp_link),
      // A link to a page on ritechs.org itself would point back at this site once it replaces the old one.
      externalUrl: /^https?:\/\/(www\.)?ritechs\.org(\/|$)/i.test(webUrl(c.external_link) ?? "") ? null : webUrl(c.external_link),
      location: opt(c.location),
      mode: (/hybrid|webinar|online/i.test(`${fullTitle} ${str(c.location)}`) ? "hybrid" : "in-person") as "hybrid",
      startDate: str(c.start_date) || null,
      endDate: str(c.end_date) || null,
      socialLinks: (socials.get(legacyId) ?? []).map((s) => ({ network: SOCIAL_ICON[str(s.name)] ?? "website", url: webUrl(s.link) })).filter((s): s is SocialLink => !!s.url && new URL(s.url).pathname.length > 1),
      legacyCoverPath: c.file ? `uploads/${str(c.file)}` : null,
      legacyCallForPapersPath: c.cfp_file ? `uploads/${str(c.cfp_file)}` : null,
      legacyCameraReadyPath: c.cp_file ? `uploads/${str(c.cp_file)}` : null,
      status: Number(c.status) === 1 ? ("published" as const) : ("draft" as const),
      legacyId,
    };
    await db.transaction(async (tx) => {
      let id: string;
      if (match) {
        id = match.id;
        await tx.update(schema.conferences).set({ ...values, publishedAt: sql`coalesce(${schema.conferences.publishedAt}, ${date(c.created_at) ?? new Date()})` }).where(eq(schema.conferences.id, id));
      } else {
        const [row] = await tx
          .insert(schema.conferences)
          .values({ ...values, slug: oldSlug.replace(/[^A-Za-z0-9_-]+/g, "-"), publishedAt: values.status === "published" ? (date(c.created_at) ?? new Date()) : null, createdAt: date(c.created_at) ?? undefined })
          .returning({ id: schema.conferences.id });
        id = row!.id;
        r.counts.conferences_created = (r.counts.conferences_created ?? 0) + 1;
      }
      const at = <T>(xs: T[]) => xs.map((x, i) => ({ ...x, conferenceId: id, position: i }));

      // Tracks: keep descriptions, scopes and chairs already written for a track of the same name.
      const prevTracks = new Map((await tx.select().from(schema.conferenceTracks).where(eq(schema.conferenceTracks.conferenceId, id))).map((x) => [keyOf(x.title), x]));
      const newTracks = (tracks.get(legacyId) ?? []).map((x) => {
        const title = str(x.title);
        const prev = prevTracks.get(keyOf(title));
        return prev ? { title, description: prev.description, scope: prev.scope, chairs: prev.chairs } : { ...trackOf(title, x.description), chairs: [] as string[] };
      });
      if (newTracks.length) {
        await tx.delete(schema.conferenceTracks).where(eq(schema.conferenceTracks.conferenceId, id));
        await tx.insert(schema.conferenceTracks).values(at(newTracks));
      }

      const dates = (schedules.get(legacyId) ?? []).filter((x) => str(x.date)).sort((a, b) => str(a.date).localeCompare(str(b.date)));
      if (dates.length) {
        await tx.delete(schema.conferenceDates).where(eq(schema.conferenceDates.conferenceId, id));
        await tx.insert(schema.conferenceDates).values(at(dates.map((x) => ({ label: str(x.title), date: str(x.date) }))));
      }

      // Fees: a table already split into early/regular/online columns is the same prices, better structured — keep it.
      const prevFees = await tx.select().from(schema.conferenceFees).where(eq(schema.conferenceFees.conferenceId, id));
      const structured = prevFees.some((f) => f.earlyAmount != null || f.onlineAmount != null);
      const fees = prices.get(legacyId) ?? [];
      if (fees.length && !structured) {
        await tx.delete(schema.conferenceFees).where(eq(schema.conferenceFees.conferenceId, id));
        await tx.insert(schema.conferenceFees).values(
          at(
            fees.map((f) => {
              const local = Number(f.local_price), overseas = Number(f.overseas_price);
              const cur = CURRENCY(f.local_currency, "USD"), ocur = CURRENCY(f.overseas_currency, cur);
              const differs = Number.isFinite(overseas) && (overseas !== local || ocur !== cur);
              return { category: str(f.title), regularAmount: Number.isFinite(local) ? String(local) : null, currency: cur, overseasAmount: differs ? String(overseas) : null, overseasCurrency: differs ? ocur : null };
            }),
          ),
        );
      }

      const committee = (committees.get(legacyId) ?? []).map((x) => ({ role: str(x.title), members: str(x.description).split(/\s*\/\s*/).map((n) => n.replace(/[,.;\s]+$/, "").trim()).filter(Boolean) })).filter((g) => g.role && g.members.length);
      if (committee.length) {
        await tx.delete(schema.conferenceCommittee).where(eq(schema.conferenceCommittee.conferenceId, id));
        await tx.insert(schema.conferenceCommittee).values(at(committee));
      }

      const sp = [...new Set((confSpeakers.get(legacyId) ?? []).map((x) => speakerIds.get(Number(x.speaker_id))).filter((x): x is string => !!x))];
      if (sp.length) {
        await tx.delete(schema.conferenceSpeakers).where(eq(schema.conferenceSpeakers.conferenceId, id));
        await tx.insert(schema.conferenceSpeakers).values(sp.map((speakerId, i) => ({ conferenceId: id, speakerId, role: "keynote", position: i })));
      }
      const so = [...new Set((confSponsors.get(legacyId) ?? []).map((x) => orgIds.get(Number(x.sponsor_id))).filter((x): x is string => !!x))];
      if (so.length) {
        await tx.delete(schema.conferenceSponsors).where(eq(schema.conferenceSponsors.conferenceId, id));
        await tx.insert(schema.conferenceSponsors).values(so.map((organisationId, i) => ({ conferenceId: id, organisationId, position: i })));
      }
      r.counts.conferences = (r.counts.conferences ?? 0) + 1;
      r.counts.conference_tracks = (r.counts.conference_tracks ?? 0) + newTracks.length;
      r.counts.conference_committee_groups = (r.counts.conference_committee_groups ?? 0) + committee.length;
      r.counts.conference_fees = (r.counts.conference_fees ?? 0) + (structured ? prevFees.length : fees.length);
      r.counts.conference_speakers = (r.counts.conference_speakers ?? 0) + sp.length;
      r.counts.conference_sponsors = (r.counts.conference_sponsors ?? 0) + so.length;
    });
  }
}

/* --------------------------- news, gallery, links -------------------------- */

async function importNewsAndGallery(db: Database, t: Map<string, Row[]>, r: Report) {
  const blogs = t.get("blogs") ?? [];
  const words = (v: unknown) => plain(v).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  /** A short stub whose words all appear in a longer post about the same story (the old site has two). */
  const isStub = (b: Row) => {
    const w = words(b.description);
    if (w.length > 60) return false;
    return blogs.some((o) => o !== b && words(o.description).length > w.length * 2 && w.filter((x) => new Set(words(o.description)).has(x)).length >= w.length * 0.9);
  };
  for (const b of blogs) {
    const legacyId = Number(b.id);
    if (isStub(b)) {
      r.counts.news_duplicates_skipped = (r.counts.news_duplicates_skipped ?? 0) + 1;
      continue;
    }
    const cover = b.image ? `uploads/${str(b.image)}` : null;
    const [prev] = await db.select({ id: schema.newsPosts.id }).from(schema.newsPosts).where(eq(schema.newsPosts.legacyId, legacyId)).limit(1);
    if (prev) {
      // Text was already edited for the new site; only add the old photo.
      await db.update(schema.newsPosts).set({ legacyCoverPath: cover }).where(eq(schema.newsPosts.id, prev.id));
    } else {
      const title = str(b.title);
      const body = htmlOf(b.description) ?? `<p>${esc(title)}</p>`;
      const text = plain(b.description);
      await db
        .insert(schema.newsPosts)
        .values({
          slug: `${slugify(title).slice(0, 80)}-${legacyId}`,
          title,
          category: /seminar/i.test(title) ? "Seminar" : /workshop|training|mastering/i.test(title) ? "Workshop" : /conference/i.test(title) ? "Conference" : "Announcement",
          excerpt: text.length > 280 ? `${text.slice(0, 277).replace(/\s+\S*$/, "")}…` : text || title,
          body,
          legacyCoverPath: cover,
          status: Number(b.status) === 1 ? "published" : "draft",
          publishedAt: date(b.blog_date) ?? date(b.created_at),
          legacyId,
          createdAt: date(b.created_at) ?? undefined,
        })
        .onConflictDoNothing();
    }
    r.counts.news = (r.counts.news ?? 0) + 1;
  }

  const images = new Map<number, Row[]>();
  for (const g of t.get("gallery_images") ?? []) images.set(Number(g.gallery_id), [...(images.get(Number(g.gallery_id)) ?? []), g]);
  for (const f of t.get("image_folders") ?? []) {
    const legacyId = Number(f.id);
    const title = str(f.name);
    const values = { title, status: Number(f.status) === 1 ? ("published" as const) : ("draft" as const), legacyId };
    const [album] = await db
      .insert(schema.galleryAlbums)
      .values({ ...values, slug: slugify(title) || `album-${legacyId}`, createdAt: date(f.created_at) ?? undefined })
      .onConflictDoUpdate({ target: schema.galleryAlbums.legacyId, set: values })
      .returning({ id: schema.galleryAlbums.id });
    const photos = (images.get(legacyId) ?? []).sort((a, b) => Number(a.id) - Number(b.id));
    await db.delete(schema.galleryItems).where(and(eq(schema.galleryItems.albumId, album!.id), sql`${schema.galleryItems.mediaId} IS NULL`));
    if (photos.length) await db.insert(schema.galleryItems).values(photos.map((p, i) => ({ albumId: album!.id, legacyPath: `uploads/${str(p.image)}`, caption: title, position: i })));
    r.counts.gallery_albums = (r.counts.gallery_albums ?? 0) + 1;
    r.counts.gallery_photos = (r.counts.gallery_photos ?? 0) + photos.length;
  }

  for (const es of t.get("event_speakers") ?? []) {
    const [ev] = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.legacyId, Number(es.event_id))).limit(1);
    const [sp] = await db.select({ id: schema.speakers.id }).from(schema.speakers).where(eq(schema.speakers.legacyId, Number(es.speaker_id))).limit(1);
    if (!ev || !sp) continue;
    await db.insert(schema.eventSpeakers).values({ eventId: ev.id, speakerId: sp.id }).onConflictDoNothing();
    r.counts.event_speakers = (r.counts.event_speakers ?? 0) + 1;
  }
}

/* ---------------------------------- pages --------------------------------- */

/** Old pages that are not content pages on the new site (the homepage and the mentor directory are built from data). */
const SKIP_PAGES = new Set(["home", "mentoring-directory"]);

/**
 * The old CMS pages (About, Mission, Benefits…) as drafts, so staff can edit
 * and publish them in Admin → Website Pages. Until a page is published the
 * website keeps its designed version. Pages edited on the new site are never
 * overwritten.
 */
async function importPages(db: Database, t: Map<string, Row[]>, r: Report) {
  const base = (process.env.LEGACY_ASSET_BASE ?? "https://ritechs.org").replace(/\/$/, "");
  for (const pg of t.get("pages") ?? []) {
    const slug = str(pg.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || SKIP_PAGES.has(slug)) continue;
    const raw = String(pg.content ?? "").replace(/(src|href)="\/(?!\/)/g, `$1="${base}/`);
    const body = htmlOf(raw);
    if (!body) continue;
    const rows = await db
      .insert(schema.pages)
      .values({
        slug,
        title: str(pg.title) || slug,
        body,
        metaDescription: opt(str(pg.meta_description).slice(0, 300)),
        status: "draft",
        legacyId: Number(pg.id),
        createdAt: date(pg.created_at) ?? undefined,
      })
      .onConflictDoNothing()
      .returning({ id: schema.pages.id });
    r.counts[rows.length ? "pages_imported_as_drafts" : "pages_kept"] = (r.counts[rows.length ? "pages_imported_as_drafts" : "pages_kept"] ?? 0) + 1;
  }
}

/* ---------------------------------- main --------------------------------- */

export async function runImport(db: Database, file: string): Promise<Report> {
  const t = readDump(readFileSync(file, "utf8"));
  const r: Report = { counts: {}, notes: [] };
  await importMembers(db, t, r);
  await importEvents(db, t, r);
  await importInboxAndLists(db, t, r);
  await importPeopleAndOrgs(db, t, r);
  await importMemberExtras(db, t, r);
  await importConferences(db, t, r);
  await importNewsAndGallery(db, t, r);
  await importPages(db, t, r);
  await db.insert(schema.auditLogs).values({ action: "legacy.imported", metadata: r.counts });
  return r;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { values } = parseArgs({ options: { file: { type: "string" }, apply: { type: "boolean", default: false } } });
  if (!values.file) {
    console.error("Usage: npm run legacy:import -- --file ritechs_db.sql [--apply]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = createPool({ url, max: 2, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-legacy-import", statementTimeoutMs: 0 });
  const db = createDb(pool);
  try {
    if (values.apply) {
      const report = await runImport(db, values.file);
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Dry run: do everything inside a transaction, print the report, roll back.
      let report: Report | undefined;
      await db
        .transaction(async (tx) => {
          report = await runImport(tx as unknown as Database, values.file!);
          throw new Error("__dry_run__");
        })
        .catch((e: Error) => {
          if (e.message !== "__dry_run__") throw e;
        });
      console.log(JSON.stringify(report, null, 2));
      console.log("\nDry run only — nothing was saved. Re-run with --apply to import.");
    }
  } finally {
    await pool.end();
  }
}

