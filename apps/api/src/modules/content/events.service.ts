import { Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import type { eventRegistrationSchema } from "@ritechs/shared";
import { and, asc, count, desc, eq, ilike, isNotNull, lt, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { badRequest, conflict, notFound } from "../../common/errors.js";
import { likeEscape, offsetOf, paged } from "../../common/http.js";
import { RevalidateService } from "../../common/revalidate.service.js";
import { sanitizeRichText } from "../../common/sanitize.js";
import { InjectDb } from "../../database/database.module.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { StorageService } from "../../storage/storage.service.js";
import { toE164 } from "../members/members.service.js";
import { isUniqueViolation } from "./conferences.service.js";
import type { EventInput, eventListQuery } from "./content.schemas.js";

const e = schema.events;
const r = schema.registrations;

@Injectable()
export class EventsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly mail: MailService,
  ) {}

  async list(q: z.infer<typeof eventListQuery> & { status?: string }, publicOnly: boolean) {
    const where: SQL[] = [];
    if (publicOnly) where.push(eq(e.status, "published"));
    else if (q.status) where.push(eq(e.status, q.status as "draft"));
    if (q.type) where.push(eq(e.type, q.type));
    if (q.when === "upcoming") where.push(sql`coalesce(${e.endsAt}, ${e.startsAt}) >= now()`);
    if (q.when === "past") where.push(and(isNotNull(e.startsAt), lt(sql`coalesce(${e.endsAt}, ${e.startsAt})`, sql`now()`))!);
    if (q.q) where.push(ilike(e.title, `%${likeEscape(q.q)}%`));
    const cond = where.length ? and(...where) : undefined;
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({ id: e.id, slug: e.slug, type: e.type, title: e.title, summary: e.summary, location: e.location, mode: e.mode, startsAt: e.startsAt, endsAt: e.endsAt, scheduleNote: e.scheduleNote, fee: e.fee, currency: e.currency, registrationOpen: e.registrationOpen, status: e.status })
        .from(e)
        .where(cond)
        .orderBy(q.when === "upcoming" ? asc(e.startsAt) : sql`${e.startsAt} DESC NULLS LAST`)
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ total: count() }).from(e).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(total), q);
  }

  async get(slugOrId: string, publicOnly: boolean) {
    const isId = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const row = await this.db.query.events.findFirst({
      where: and(isId ? eq(e.id, slugOrId) : eq(e.slug, slugOrId), publicOnly ? eq(e.status, "published") : undefined),
      with: { cover: true, speakers: { with: { speaker: { with: { photo: true } } }, orderBy: (t, { asc: a }) => [a(t.position)] } },
    });
    if (!row) throw notFound("Event");
    const { cover, speakers, createdBy: _c, legacyId: _l, ...rest } = row;
    const [{ taken }] = (await this.db.select({ taken: count() }).from(r).where(and(eq(r.eventId, row.id), sql`${r.status} <> 'cancelled'`))) as [{ taken: number }];
    return {
      ...rest,
      coverUrl: this.storage.urlOf(cover?.storageKey),
      placesLeft: row.capacity ? Math.max(0, row.capacity - Number(taken)) : null,
      speakers: speakers.map((s) => ({ id: s.speaker.id, name: s.speaker.name, designation: s.speaker.designation, organisation: s.speaker.organisation, photoUrl: this.storage.urlOf(s.speaker.photo?.storageKey, s.speaker.legacyPhotoPath) })),
    };
  }

  async save(input: EventInput, actorId: string, id?: string) {
    const { speakerIds, ...fields } = input;
    const values = {
      ...fields,
      description: fields.description ? sanitizeRichText(fields.description) : null,
      startsAt: fields.startsAt ? new Date(fields.startsAt) : null,
      endsAt: fields.endsAt ? new Date(fields.endsAt) : null,
      fee: fields.fee ?? null,
    };
    try {
      const eventId = await this.db.transaction(async (tx) => {
        let eid = id;
        if (id) {
          const [prev] = await tx.select({ publishedAt: e.publishedAt }).from(e).where(eq(e.id, id)).for("update");
          if (!prev) throw notFound("Event");
          await tx.update(e).set({ ...values, publishedAt: values.status === "published" ? (prev.publishedAt ?? new Date()) : prev.publishedAt }).where(eq(e.id, id));
          await tx.delete(schema.eventSpeakers).where(eq(schema.eventSpeakers.eventId, id));
        } else {
          const [row] = await tx.insert(e).values({ ...values, createdBy: actorId, publishedAt: values.status === "published" ? new Date() : null }).returning({ id: e.id });
          eid = row!.id;
        }
        if (speakerIds.length) await tx.insert(schema.eventSpeakers).values(speakerIds.map((s, i) => ({ eventId: eid!, speakerId: s, position: i })));
        return eid!;
      });
      await this.audit.record({ action: id ? "event.updated" : "event.created", actorId, entityType: "event", entityId: eventId, metadata: { slug: input.slug } });
      await this.revalidate.tags("events", `event:${input.slug}`);
      return this.get(eventId, false);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("Another event already uses this slug.", "SLUG_TAKEN");
      throw err;
    }
  }

  async remove(id: string, actorId: string) {
    const [row] = await this.db.delete(e).where(eq(e.id, id)).returning({ slug: e.slug });
    if (!row) throw notFound("Event");
    await this.audit.record({ action: "event.deleted", actorId, entityType: "event", entityId: id, metadata: { slug: row.slug } });
    await this.revalidate.tags("events", `event:${row.slug}`);
  }

  /**
   * Public sign-up. Capacity is enforced under a row lock so the last place
   * cannot be taken twice. A repeat sign-up gets the same answer as a new one.
   */
  async register(slug: string, input: z.infer<typeof eventRegistrationSchema>, userId?: string) {
    const result = await this.db.transaction(async (tx) => {
      const [ev] = await tx
        .select({ id: e.id, title: e.title, capacity: e.capacity, open: e.registrationOpen, startsAt: e.startsAt })
        .from(e)
        .where(and(eq(e.slug, slug), eq(e.status, "published")))
        .for("update")
        .limit(1);
      if (!ev) throw notFound("Event");
      if (!ev.open || (ev.startsAt && ev.startsAt < new Date())) throw badRequest("Registration for this event is closed.", "REGISTRATION_CLOSED");
      const [dup] = await tx.select({ id: r.id }).from(r).where(and(eq(r.eventId, ev.id), sql`lower(${r.email}) = ${input.email}`)).limit(1);
      if (dup) return { ev, created: false, waitlisted: false };
      let waitlisted = false;
      if (ev.capacity) {
        const [{ n }] = (await tx.select({ n: count() }).from(r).where(and(eq(r.eventId, ev.id), sql`${r.status} IN ('pending','confirmed')`))) as [{ n: number }];
        waitlisted = Number(n) >= ev.capacity;
      }
      await tx.insert(r).values({
        eventId: ev.id,
        userId: userId ?? null,
        name: input.name,
        email: input.email,
        phoneE164: input.phone ? toE164(input.phone) : null,
        organisation: input.organisation ?? null,
        attendance: input.attendance ?? null,
        notes: input.notes ?? null,
        status: waitlisted ? "waitlisted" : "pending",
      });
      return { ev, created: true, waitlisted };
    });
    if (result.created) await this.mail.queue(input.email, "event-registration", { name: input.name, title: result.ev.title });
    return { status: "received" };
  }

  async registrations(target: { eventId?: string; conferenceId?: string }, q: { page: number; pageSize: number; q?: string | undefined }) {
    const where: SQL[] = [target.eventId ? eq(r.eventId, target.eventId) : eq(r.conferenceId, target.conferenceId!)];
    if (q.q) where.push(sql`(${r.name} ILIKE ${`%${likeEscape(q.q)}%`} OR ${r.email} ILIKE ${`%${likeEscape(q.q)}%`})`);
    const cond = and(...where);
    const [items, [{ total }]] = await Promise.all([
      this.db.select().from(r).where(cond).orderBy(desc(r.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(r).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(total), q);
  }

  /** Every registration (conferences and events), newest first: the old site's "Event requests". */
  async allRegistrations(q: { page: number; pageSize: number; q?: string | undefined; kind?: "event" | "conference" | undefined; status?: string | undefined }) {
    const where: SQL[] = [];
    if (q.kind === "event") where.push(sql`${r.eventId} IS NOT NULL`);
    if (q.kind === "conference") where.push(sql`${r.conferenceId} IS NOT NULL`);
    if (q.status) where.push(eq(r.status, q.status as "pending"));
    if (q.q) {
      const like = `%${likeEscape(q.q)}%`;
      where.push(sql`(${r.name} ILIKE ${like} OR ${r.email} ILIKE ${like} OR ${r.organisation} ILIKE ${like} OR ${schema.events.title} ILIKE ${like} OR ${schema.conferences.acronym} ILIKE ${like})`);
    }
    const cond = where.length ? and(...where) : undefined;
    const base = () =>
      this.db
        .select({
          id: r.id, name: r.name, email: r.email, phoneE164: r.phoneE164, organisation: r.organisation, attendance: r.attendance, notes: r.notes, status: r.status, createdAt: r.createdAt,
          eventId: r.eventId, conferenceId: r.conferenceId, eventTitle: schema.events.title, eventType: schema.events.type, eventFee: schema.events.fee, eventCurrency: schema.events.currency, conferenceAcronym: schema.conferences.acronym,
        })
        .from(r)
        .leftJoin(schema.events, eq(schema.events.id, r.eventId))
        .leftJoin(schema.conferences, eq(schema.conferences.id, r.conferenceId));
    const [items, [{ total }]] = await Promise.all([
      base().where(cond).orderBy(desc(r.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(r).leftJoin(schema.events, eq(schema.events.id, r.eventId)).leftJoin(schema.conferences, eq(schema.conferences.id, r.conferenceId)).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(total), q);
  }

  async removeRegistration(id: string, actorId: string) {
    const [row] = await this.db.delete(r).where(eq(r.id, id)).returning({ id: r.id, email: r.email });
    if (!row) throw notFound("Registration");
    await this.audit.record({ action: "registration.deleted", actorId, entityType: "registration", entityId: id });
  }

  async setRegistrationStatus(id: string, status: "pending" | "confirmed" | "waitlisted" | "cancelled", actorId: string) {
    const [row] = await this.db.update(r).set({ status }).where(eq(r.id, id)).returning({ id: r.id });
    if (!row) throw notFound("Registration");
    await this.audit.record({ action: "registration.status_changed", actorId, entityType: "registration", entityId: id, metadata: { status } });
    return row;
  }

  /** CSV export. Cells are quoted, and values starting with = + - @ are neutralised (spreadsheet formula injection). */
  async exportCsv(target: { eventId?: string; conferenceId?: string }, actorId: string) {
    const all = !target.eventId && !target.conferenceId;
    const rows = await this.db
      .select({ name: r.name, email: r.email, phoneE164: r.phoneE164, organisation: r.organisation, attendance: r.attendance, status: r.status, notes: r.notes, createdAt: r.createdAt, what: sql<string | null>`coalesce(${schema.conferences.acronym}, ${schema.events.title})` })
      .from(r)
      .leftJoin(schema.events, eq(schema.events.id, r.eventId))
      .leftJoin(schema.conferences, eq(schema.conferences.id, r.conferenceId))
      .where(all ? undefined : target.eventId ? eq(r.eventId, target.eventId) : eq(r.conferenceId, target.conferenceId!))
      .orderBy(asc(r.createdAt));
    await this.audit.record({ action: "registration.exported", actorId, entityType: all ? "registrations" : target.eventId ? "event" : "conference", ...(target.eventId ?? target.conferenceId ? { entityId: (target.eventId ?? target.conferenceId)! } : {}), metadata: { rows: rows.length } });
    const cell = (v: unknown) => {
      let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = [...(all ? ["Event"] : []), "Name", "Email", "Phone", "Organisation", "Attendance", "Status", "Notes", "Registered"];
    const lines = rows.map((x) => [...(all ? [x.what] : []), x.name, x.email, x.phoneE164, x.organisation, x.attendance, x.status, x.notes, x.createdAt].map(cell).join(","));
    return [head.map(cell).join(","), ...lines].join("\r\n");
  }
}
