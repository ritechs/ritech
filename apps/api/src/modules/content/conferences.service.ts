import { Inject, Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import type { eventRegistrationSchema } from "@ritechs/shared";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { ENV, type Env } from "../../config/env.js";
import { conflict, notFound } from "../../common/errors.js";
import { likeEscape, offsetOf, paged, type ListQuery } from "../../common/http.js";
import { RevalidateService } from "../../common/revalidate.service.js";
import { sanitizeRichText } from "../../common/sanitize.js";
import { InjectDb } from "../../database/database.module.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { StorageService } from "../../storage/storage.service.js";
import { toE164 } from "../members/members.service.js";
import type { ConferenceInput } from "./content.schemas.js";

const c = schema.conferences;

export const isUniqueViolation = (err: unknown) => (err as { code?: string; cause?: { code?: string } }).code === "23505" || (err as { cause?: { code?: string } }).cause?.code === "23505";

@Injectable()
export class ConferencesService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly mail: MailService,
  ) {}

  async list(q: ListQuery & { status?: string }, publicOnly: boolean) {
    const where: SQL[] = [];
    if (publicOnly) where.push(eq(c.status, "published"));
    else if (q.status) where.push(eq(c.status, q.status as "draft"));
    if (q.q) where.push(or(ilike(c.title, `%${likeEscape(q.q)}%`), ilike(c.acronym, `%${likeEscape(q.q)}%`))!);
    const cond = where.length ? and(...where) : undefined;
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({ id: c.id, slug: c.slug, acronym: c.acronym, title: c.title, location: c.location, mode: c.mode, startDate: c.startDate, endDate: c.endDate, externalUrl: c.externalUrl, status: c.status, featured: c.featured, updatedAt: c.updatedAt, coverKey: schema.media.storageKey, legacyCoverPath: c.legacyCoverPath })
        .from(c)
        .leftJoin(schema.media, eq(schema.media.id, c.coverId))
        .where(cond)
        .orderBy(sql`${c.startDate} DESC NULLS LAST`, desc(c.createdAt))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ total: count() }).from(c).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items.map(({ coverKey, legacyCoverPath, ...i }) => ({ ...i, coverUrl: this.storage.urlOf(coverKey, legacyCoverPath) })), Number(total), q);
  }

  async get(slugOrId: string, publicOnly: boolean) {
    const isId = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const row = await this.db.query.conferences.findFirst({
      where: and(isId ? eq(c.id, slugOrId) : eq(c.slug, slugOrId), publicOnly ? eq(c.status, "published") : undefined),
      with: {
        cover: true,
        tracks: { orderBy: (t, { asc: a }) => [a(t.position)] },
        dates: { orderBy: (t, { asc: a }) => [a(t.position)] },
        fees: { orderBy: (t, { asc: a }) => [a(t.position)] },
        committee: { orderBy: (t, { asc: a }) => [a(t.position)] },
        awards: { orderBy: (t, { asc: a }) => [a(t.position)] },
        sponsorship: { orderBy: (t, { asc: a }) => [a(t.position)] },
        speakers: { with: { speaker: { with: { photo: true } } }, orderBy: (t, { asc: a }) => [a(t.position)] },
        sponsors: { with: { organisation: { with: { logo: true } } }, orderBy: (t, { asc: a }) => [a(t.position)] },
      },
    });
    if (!row) throw notFound("Conference");
    const { cover, speakers, sponsors, createdBy: _cb, legacyId: _l, legacyCoverPath, legacyCallForPapersPath, legacyCameraReadyPath, ...rest } = row;
    const cfp = rest.callForPapersId ? await this.db.query.media.findFirst({ where: eq(schema.media.id, rest.callForPapersId) }) : null;
    return {
      ...rest,
      coverUrl: this.storage.urlOf(cover?.storageKey, legacyCoverPath),
      callForPapersUrl: this.storage.urlOf(cfp?.storageKey, legacyCallForPapersPath),
      cameraReadyFileUrl: legacyCameraReadyPath ? this.storage.legacyUrl(legacyCameraReadyPath) : null,
      speakers: speakers.map((s) => ({ id: s.speaker.id, slug: s.speaker.slug, name: s.speaker.name, designation: s.speaker.designation, organisation: s.speaker.organisation, role: s.role, photoUrl: this.storage.urlOf(s.speaker.photo?.storageKey, s.speaker.legacyPhotoPath) })),
      sponsors: sponsors.map((s) => ({ id: s.organisation.id, name: s.organisation.name, website: s.organisation.website, tier: s.tier, logoUrl: this.storage.urlOf(s.organisation.logo?.storageKey, s.organisation.legacyLogoPath) })),
    };
  }

  /** Create or fully replace a conference and all its sections in one transaction. */
  async save(input: ConferenceInput, actorId: string, id?: string) {
    const { tracks, dates, fees, committee, awards, sponsorship, speakerIds, sponsorIds, ...fields } = input;
    const values = {
      ...fields,
      about: fields.about ? sanitizeRichText(fields.about) : null,
      joinUs: fields.joinUs ? sanitizeRichText(fields.joinUs) : null,
      paperSubmission: fields.paperSubmission ? sanitizeRichText(fields.paperSubmission) : null,
      highlights: fields.highlights ? sanitizeRichText(fields.highlights) : null,
      cameraReady: fields.cameraReady ? sanitizeRichText(fields.cameraReady) : null,
    };
    try {
      const saved = await this.db.transaction(async (tx) => {
        let confId = id;
        if (id) {
          const [prev] = await tx.select({ publishedAt: c.publishedAt }).from(c).where(eq(c.id, id)).for("update");
          if (!prev) throw notFound("Conference");
          await tx.update(c).set({ ...values, publishedAt: values.status === "published" ? (prev.publishedAt ?? new Date()) : prev.publishedAt }).where(eq(c.id, id));
          for (const t of [schema.conferenceTracks, schema.conferenceDates, schema.conferenceFees, schema.conferenceCommittee, schema.conferenceAwards, schema.sponsorshipPackages, schema.conferenceSpeakers, schema.conferenceSponsors])
            await tx.delete(t).where(eq(t.conferenceId, id));
        } else {
          const [row] = await tx.insert(c).values({ ...values, createdBy: actorId, publishedAt: values.status === "published" ? new Date() : null }).returning({ id: c.id });
          confId = row!.id;
        }
        const cid = confId!;
        const at = <T>(xs: T[]) => xs.map((x, i) => ({ ...x, conferenceId: cid, position: i }));
        if (tracks.length) await tx.insert(schema.conferenceTracks).values(at(tracks));
        if (dates.length) await tx.insert(schema.conferenceDates).values(at(dates));
        if (fees.length) await tx.insert(schema.conferenceFees).values(at(fees).map((f) => ({ ...f, earlyAmount: f.earlyAmount ?? null, regularAmount: f.regularAmount ?? null, onlineAmount: f.onlineAmount ?? null, overseasAmount: f.overseasAmount ?? null, overseasCurrency: f.overseasAmount ? (f.overseasCurrency ?? f.currency) : null })));
        if (committee.length) await tx.insert(schema.conferenceCommittee).values(at(committee));
        if (awards.length) await tx.insert(schema.conferenceAwards).values(at(awards));
        if (sponsorship.length) await tx.insert(schema.sponsorshipPackages).values(at(sponsorship));
        if (speakerIds.length) await tx.insert(schema.conferenceSpeakers).values(speakerIds.map((s, i) => ({ conferenceId: cid, speakerId: s.id, role: s.role, position: i })));
        if (sponsorIds.length) await tx.insert(schema.conferenceSponsors).values(sponsorIds.map((s, i) => ({ conferenceId: cid, organisationId: s.id, tier: s.tier ?? null, position: i })));
        return cid;
      });
      await this.audit.record({ action: id ? "conference.updated" : "conference.created", actorId, entityType: "conference", entityId: saved, metadata: { slug: input.slug, status: input.status } });
      await this.revalidate.tags("conferences", `conference:${input.slug}`);
      return this.get(saved, false);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("Another conference already uses this slug.", "SLUG_TAKEN");
      if ((err as { code?: string }).code === "23503" || (err as { cause?: { code?: string } }).cause?.code === "23503") throw conflict("A selected speaker, sponsor or file no longer exists.", "INVALID_REFERENCE");
      throw err;
    }
  }

  async remove(id: string, actorId: string) {
    const [row] = await this.db.delete(c).where(eq(c.id, id)).returning({ slug: c.slug });
    if (!row) throw notFound("Conference");
    await this.audit.record({ action: "conference.deleted", actorId, entityType: "conference", entityId: id, metadata: { slug: row.slug } });
    await this.revalidate.tags("conferences", `conference:${row.slug}`);
  }

  /** Expression of interest / registration for a conference that is upcoming and published. */
  async register(slug: string, input: z.infer<typeof eventRegistrationSchema>, userId?: string) {
    const [conf] = await this.db
      .select({ id: c.id, title: c.title, endDate: c.endDate })
      .from(c)
      .where(and(eq(c.slug, slug), eq(c.status, "published"), sql`(${c.endDate} IS NULL OR ${c.endDate} >= current_date)`, sql`${c.externalUrl} IS NULL`))
      .limit(1);
    if (!conf) throw notFound("Open conference");
    try {
      await this.db.insert(schema.registrations).values({
        conferenceId: conf.id,
        userId: userId ?? null,
        name: input.name,
        email: input.email,
        phoneE164: input.phone ? toE164(input.phone) : null,
        organisation: input.organisation ?? null,
        attendance: input.attendance ?? null,
        notes: input.notes ?? null,
      });
    } catch (err) {
      // Already registered: answer exactly as for a new registration.
      if (!isUniqueViolation(err)) throw err;
      return { status: "received" };
    }
    await this.mail.queue(input.email, "event-registration", { name: input.name, title: conf.title });
    return { status: "received" };
  }
}
