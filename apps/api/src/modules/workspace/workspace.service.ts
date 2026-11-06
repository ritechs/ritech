/**
 * The member dashboard (/dashboard): what mentors and mentees manage for
 * themselves — projects, courses, resources, funding calls, requests between
 * members and private messages. Every query is scoped to the signed-in user.
 */
import { isUniqueViolation } from "../content/conferences.service.js";
import { Inject, Injectable } from "@nestjs/common";
import { schema, type Database, type MemberProject } from "@ritechs/db";
import type { fundingCallSchema, memberMessageSchema, memberRequestSchema, mentorCourseSchema, requestResponseSchema } from "@ritechs/shared";
import { richToPlainText } from "@ritechs/shared";
import { aliasedTable, and, count, desc, eq, gte, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { ENV, type Env } from "../../config/env.js";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors.js";
import { offsetOf, paged } from "../../common/http.js";
import { RevalidateService } from "../../common/revalidate.service.js";
import type { UploadedFileLike } from "../../common/upload.js";
import { InjectDb } from "../../database/database.module.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { MediaService } from "../../storage/media.service.js";
import { StorageService } from "../../storage/storage.service.js";

const p = schema.memberProfiles;
const rq = schema.memberRequests;
const msg = schema.memberMessages;
const MAX_RESOURCES = 40;
const MAX_COURSES = 30;
const MAX_FUNDING = 50;

type CourseInput = z.infer<typeof mentorCourseSchema>;
type FundingInput = z.infer<typeof fundingCallSchema>;
type RequestInput = z.infer<typeof memberRequestSchema>;
type ResponseInput = z.infer<typeof requestResponseSchema>;
type MessageInput = z.infer<typeof memberMessageSchema>;
export type Box = "in" | "out";

interface Me {
  userId: string;
  type: "mentor" | "mentee";
  status: string;
  slug: string;
  name: string;
  email: string;
  legacyId: number | null;
  legacyMentorId: number | null;
}

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly media: MediaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {}

  private dashUrl(path = "") {
    return `${this.env.WEB_URL.replace(/\/$/, "")}/dashboard${path}`;
  }

  /** The caller's member profile; most of the dashboard needs one. */
  private async profile(userId: string, opts: { approved?: boolean; type?: "mentor" } = {}): Promise<Me> {
    const [row] = await this.db
      .select({ userId: p.userId, type: p.type, status: p.status, slug: p.slug, firstName: p.firstName, lastName: p.lastName, email: schema.user.email, legacyId: p.legacyId, legacyMentorId: p.legacyMentorId })
      .from(p)
      .innerJoin(schema.user, eq(schema.user.id, p.userId))
      .where(eq(p.userId, userId))
      .limit(1);
    if (!row) throw forbidden("This area is for RiTECHS mentors and mentees.", "NO_MEMBER_PROFILE");
    if (row.status === "suspended") throw forbidden("Your membership is suspended.", "MEMBERSHIP_SUSPENDED");
    if (opts.approved && row.status !== "approved") throw forbidden("You can do this once your membership is approved.", "MEMBERSHIP_NOT_APPROVED");
    if (opts.type && row.type !== opts.type) throw forbidden(`This is only available to ${opts.type}s.`, "WRONG_MEMBER_TYPE");
    return { ...row, name: `${row.firstName} ${row.lastName}` };
  }

  private photo(key: string | null, legacy: string | null) {
    return this.storage.urlOf(key, legacy);
  }

  /* -------------------------------- overview -------------------------------- */

  async overview(userId: string) {
    const me = await this.profile(userId);
    const [full] = await this.db.select().from(p).where(eq(p.userId, userId));
    const [[expertise], [courses], [resources], [funding], [incoming], [unread], [outgoing], connections] = await Promise.all([
      this.db.select({ n: count() }).from(schema.memberExpertise).where(eq(schema.memberExpertise.userId, userId)),
      this.db.select({ n: count() }).from(schema.mentorCourses).where(eq(schema.mentorCourses.userId, userId)),
      this.db.select({ n: count() }).from(schema.memberResources).where(eq(schema.memberResources.userId, userId)),
      this.db.select({ n: count() }).from(schema.fundingCalls).where(eq(schema.fundingCalls.userId, userId)),
      this.db.select({ n: count() }).from(rq).where(and(eq(rq.toUserId, userId), eq(rq.status, "pending"))),
      this.db.select({ n: count() }).from(msg).where(and(eq(msg.toUserId, userId), isNull(msg.readAt))),
      this.db.select({ n: count() }).from(rq).where(and(eq(rq.fromUserId, userId), eq(rq.status, "pending"))),
      this.connectedIds(me),
    ]);
    const f = full!;
    const links = f.links ?? {};
    const researchLink = !!(links.scholar || links.orcid || links.scopus || links.researchgate);
    const mentor = me.type === "mentor";
    const checklist = [
      { key: "photo", label: "Add a profile photo", done: !!(f.photoId || f.legacyPhotoPath), href: "/dashboard/profile" },
      { key: "bio", label: "Write a short biography", done: richToPlainText(f.bio).length >= 80, href: "/dashboard/biography" },
      { key: "position", label: "Add your position and organisation", done: !!(f.position && f.affiliation), href: "/dashboard/profile" },
      { key: "field", label: mentor ? "Name your field of research" : "Name your field of study", done: !!f.researchField, href: "/dashboard/biography" },
      { key: "expertise", label: "Choose your areas of expertise", done: expertise!.n > 0, href: "/dashboard/expertise" },
      { key: "links", label: "Link Google Scholar, ORCID, Scopus or ResearchGate", done: researchLink, href: "/dashboard/scholar" },
      ...(mentor ? [{ key: "projects", label: "List a research project", done: (f.projects ?? []).length > 0, href: "/dashboard/projects" }] : []),
    ];
    // Mentors see what was sent to them; mentees follow what they asked for.
    const recent = await this.requests(userId, mentor ? "in" : "out", { page: 1, pageSize: 5 });
    return {
      profile: { type: me.type, status: me.status, slug: me.slug, name: me.name, showInDirectory: f.showInDirectory },
      checklist,
      completeness: Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100),
      counts: {
        connections: connections.size,
        pendingRequests: Number(incoming!.n),
        unreadMessages: Number(unread!.n),
        sentPending: Number(outgoing!.n),
        expertise: Number(expertise!.n),
        projects: (f.projects ?? []).length,
        courses: Number(courses!.n),
        resources: Number(resources!.n),
        funding: Number(funding!.n),
      },
      recentRequests: recent.items,
    };
  }

  /* -------------------------------- projects -------------------------------- */

  async setProjects(userId: string, projects: MemberProject[]) {
    const me = await this.profile(userId);
    const clean = projects.map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== "")) as MemberProject);
    await this.db.update(p).set({ projects: clean }).where(eq(p.userId, userId));
    await this.audit.record({ action: "member.projects_updated", entityType: "user", entityId: userId, metadata: { count: clean.length } });
    if (me.type === "mentor") await this.revalidate.tags("mentors");
    return { projects: clean };
  }

  /* --------------------------------- courses -------------------------------- */

  async courses(userId: string) {
    await this.profile(userId);
    const c = schema.mentorCourses;
    const rows = await this.db
      .select({
        course: c,
        requests: sql<number>`(SELECT count(*)::int FROM member_requests r WHERE r.course_id = ${c.id} AND r.status IN ('pending','accepted'))`,
      })
      .from(c)
      .where(eq(c.userId, userId))
      .orderBy(desc(c.createdAt));
    return rows.map((r) => ({ ...r.course, requests: r.requests }));
  }

  async saveCourse(userId: string, id: string | null, input: CourseInput) {
    await this.profile(userId, { type: "mentor" });
    const c = schema.mentorCourses;
    const values = { ...input, fee: input.fee == null ? null : String(input.fee) };
    let row;
    if (id) {
      [row] = await this.db.update(c).set(values).where(and(eq(c.id, id), eq(c.userId, userId))).returning();
      if (!row) throw notFound("Course");
    } else {
      const [{ n }] = (await this.db.select({ n: count() }).from(c).where(eq(c.userId, userId))) as [{ n: number }];
      if (n >= MAX_COURSES) throw badRequest(`You can list up to ${MAX_COURSES} courses.`);
      [row] = await this.db.insert(c).values({ ...values, userId }).returning();
    }
    await this.audit.record({ action: id ? "member.course_updated" : "member.course_created", entityType: "mentor_course", entityId: row!.id });
    await this.revalidate.tags("mentors");
    return row;
  }

  async deleteCourse(userId: string, id: string) {
    const c = schema.mentorCourses;
    const [row] = await this.db.delete(c).where(and(eq(c.id, id), eq(c.userId, userId))).returning({ id: c.id });
    if (!row) throw notFound("Course");
    await this.audit.record({ action: "member.course_deleted", entityType: "mentor_course", entityId: id });
    await this.revalidate.tags("mentors");
  }

  /* -------------------------------- resources ------------------------------- */

  async resources(userId: string) {
    const r = schema.memberResources;
    const rows = await this.db
      .select({ id: r.id, title: r.title, url: r.url, isPublic: r.isPublic, createdAt: r.createdAt, key: schema.media.storageKey, mime: schema.media.mimeType, size: schema.media.sizeBytes })
      .from(r)
      .leftJoin(schema.media, eq(schema.media.id, r.mediaId))
      .where(eq(r.userId, userId))
      .orderBy(desc(r.createdAt));
    return rows.map(({ key, ...x }) => ({ ...x, kind: key ? "file" : "link", href: key ? this.storage.publicUrl(key) : x.url }));
  }

  private async checkResourceRoom(userId: string) {
    const [{ n }] = (await this.db.select({ n: count() }).from(schema.memberResources).where(eq(schema.memberResources.userId, userId))) as [{ n: number }];
    if (n >= MAX_RESOURCES) throw badRequest(`You can share up to ${MAX_RESOURCES} resources. Remove one to add another.`);
  }

  async addResourceLink(userId: string, title: string, url: string) {
    await this.profile(userId);
    await this.checkResourceRoom(userId);
    const [row] = await this.db.insert(schema.memberResources).values({ userId, title, url }).returning();
    await this.audit.record({ action: "member.resource_added", entityType: "member_resource", entityId: row!.id });
    await this.revalidate.tags("mentors");
    return row;
  }

  async addResourceFile(userId: string, title: string, file: UploadedFileLike) {
    await this.profile(userId);
    await this.checkResourceRoom(userId);
    // PDFs are kept as they are; images are re-encoded (MediaService checks the real type from the bytes).
    const isPdf = file.buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    const stored = await this.media.store(file, isPdf ? "document" : "content", userId, title);
    const [row] = await this.db.insert(schema.memberResources).values({ userId, title, mediaId: stored.id }).returning();
    await this.audit.record({ action: "member.resource_added", entityType: "member_resource", entityId: row!.id });
    await this.revalidate.tags("mentors");
    return row;
  }

  async deleteResource(userId: string, id: string) {
    const r = schema.memberResources;
    const [row] = await this.db.delete(r).where(and(eq(r.id, id), eq(r.userId, userId))).returning({ mediaId: r.mediaId });
    if (!row) throw notFound("Resource");
    if (row.mediaId) {
      const [m] = await this.db.delete(schema.media).where(eq(schema.media.id, row.mediaId)).returning({ key: schema.media.storageKey });
      if (m) await this.storage.remove(m.key).catch(() => undefined);
    }
    await this.audit.record({ action: "member.resource_deleted", entityType: "member_resource", entityId: id });
    await this.revalidate.tags("mentors");
  }

  /* --------------------------------- funding -------------------------------- */

  // Funding & Grants is a mentor feature; mentees do not see or apply for calls.
  async funding(userId: string, scope: "mine" | "open") {
    await this.profile(userId, { type: "mentor" });
    const fc = schema.fundingCalls;
    const today = new Date().toISOString().slice(0, 10);
    const where: SQL = scope === "mine" ? eq(fc.userId, userId) : and(ne(fc.userId, userId), eq(fc.open, true), or(isNull(fc.deadline), gte(fc.deadline, today)))!;
    const rows = await this.db
      .select({
        call: fc,
        ownerFirst: p.firstName,
        ownerLast: p.lastName,
        ownerSlug: p.slug,
        ownerType: p.type,
        applications: sql<number>`(SELECT count(*)::int FROM member_requests r WHERE r.funding_id = ${fc.id} AND r.status IN ('pending','accepted'))`,
        myRequest: sql<string | null>`(SELECT r.status FROM member_requests r WHERE r.funding_id = ${fc.id} AND r.from_user_id = ${userId} ORDER BY r.created_at DESC LIMIT 1)`,
      })
      .from(fc)
      .innerJoin(p, eq(p.userId, fc.userId))
      .where(where)
      .orderBy(sql`${fc.deadline} ASC NULLS LAST`, desc(fc.createdAt))
      .limit(200);
    const topicIds = [...new Set(rows.flatMap((r) => r.call.expertiseIds))];
    const topics = topicIds.length ? await this.db.select({ id: schema.expertise.id, name: schema.expertise.name }).from(schema.expertise).where(inArray(schema.expertise.id, topicIds)) : [];
    const name = new Map(topics.map((t) => [t.id, t.name]));
    return rows.map((r) => ({
      ...r.call,
      topics: r.call.expertiseIds.map((id) => ({ id, name: name.get(id) ?? "" })).filter((t) => t.name),
      owner: { name: `${r.ownerFirst} ${r.ownerLast}`, slug: r.ownerType === "mentor" ? r.ownerSlug : null },
      applications: r.applications,
      myRequest: r.myRequest,
    }));
  }

  async saveFunding(userId: string, id: string | null, input: FundingInput) {
    await this.profile(userId, { approved: true, type: "mentor" });
    const fc = schema.fundingCalls;
    const values = { ...input, link: input.link || null };
    let row;
    if (id) {
      [row] = await this.db.update(fc).set(values).where(and(eq(fc.id, id), eq(fc.userId, userId))).returning();
      if (!row) throw notFound("Funding call");
    } else {
      const [{ n }] = (await this.db.select({ n: count() }).from(fc).where(eq(fc.userId, userId))) as [{ n: number }];
      if (n >= MAX_FUNDING) throw badRequest(`You can post up to ${MAX_FUNDING} funding calls.`);
      [row] = await this.db.insert(fc).values({ ...values, userId }).returning();
    }
    await this.audit.record({ action: id ? "member.funding_updated" : "member.funding_created", entityType: "funding_call", entityId: row!.id });
    return row;
  }

  async deleteFunding(userId: string, id: string) {
    const fc = schema.fundingCalls;
    const [row] = await this.db.delete(fc).where(and(eq(fc.id, id), eq(fc.userId, userId))).returning({ id: fc.id });
    if (!row) throw notFound("Funding call");
    await this.audit.record({ action: "member.funding_deleted", entityType: "funding_call", entityId: id });
  }

  /* -------------------------------- requests -------------------------------- */

  async requests(userId: string, box: Box, q: { page: number; pageSize: number; status?: string }) {
    const other = aliasedTable(p, "other");
    const otherMedia = aliasedTable(schema.media, "other_media");
    const otherUser = aliasedTable(schema.user, "other_user");
    const mine = box === "in" ? eq(rq.toUserId, userId) : eq(rq.fromUserId, userId);
    const where = and(mine, q.status ? eq(rq.status, q.status) : undefined);
    const otherId = box === "in" ? rq.fromUserId : rq.toUserId;
    const [rows, [total]] = await Promise.all([
      this.db
        .select({
          r: rq,
          name: otherUser.name,
          email: otherUser.email,
          slug: other.slug,
          type: other.type,
          position: other.position,
          affiliation: other.affiliation,
          photoKey: otherMedia.storageKey,
          legacyPhoto: other.legacyPhotoPath,
          bio: other.bio,
          researchField: other.researchField,
          links: other.links,
          projects: other.projects,
          course: schema.mentorCourses.title,
          funding: schema.fundingCalls.title,
        })
        .from(rq)
        .innerJoin(otherUser, eq(otherUser.id, otherId))
        .leftJoin(other, eq(other.userId, otherId))
        .leftJoin(otherMedia, eq(otherMedia.id, other.photoId))
        .leftJoin(schema.mentorCourses, eq(schema.mentorCourses.id, rq.courseId))
        .leftJoin(schema.fundingCalls, eq(schema.fundingCalls.id, rq.fundingId))
        .where(where)
        .orderBy(sql`(${rq.status} = 'pending') DESC`, desc(rq.createdAt))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ n: count() }).from(rq).where(where),
    ]);
    // Whoever receives a request sees the sender's profile (biography, research IDs, projects, expertise) to decide.
    const expertise = new Map<string, string[]>();
    if (box === "in" && rows.length) {
      const ids = [...new Set(rows.map((x) => x.r.fromUserId))];
      const ex = await this.db
        .select({ userId: schema.memberExpertise.userId, name: schema.expertise.name })
        .from(schema.memberExpertise)
        .innerJoin(schema.expertise, eq(schema.expertise.id, schema.memberExpertise.expertiseId))
        .where(inArray(schema.memberExpertise.userId, ids));
      for (const e of ex) expertise.set(e.userId, [...(expertise.get(e.userId) ?? []), e.name]);
    }
    return paged(
      rows.map((x) => ({
        id: x.r.id,
        kind: x.r.kind,
        status: x.r.status,
        message: x.r.message,
        reply: x.r.reply,
        createdAt: x.r.createdAt,
        respondedAt: x.r.respondedAt,
        subject: x.r.kind === "course" ? x.course : x.r.kind === "funding" ? x.funding : null,
        person: {
          id: box === "in" ? x.r.fromUserId : x.r.toUserId,
          name: x.name,
          // Email is shared once a request has been accepted, so the two can arrange things directly.
          email: x.r.status === "accepted" ? x.email : null,
          type: x.type,
          slug: x.type === "mentor" ? x.slug : null,
          position: x.position,
          affiliation: x.affiliation,
          photoUrl: this.photo(x.photoKey, x.legacyPhoto),
          ...(box === "in"
            ? { profile: { bio: x.bio ?? "", researchField: x.researchField, links: x.links ?? {}, projects: x.projects ?? [], expertise: expertise.get(x.r.fromUserId) ?? [] } }
            : {}),
        },
      })),
      Number(total!.n),
      q,
    );
  }

  async createRequest(userId: string, input: RequestInput) {
    const me = await this.profile(userId, { approved: true });
    let toUserId: string;
    let courseId: string | null = null;
    let fundingId: string | null = null;
    let what: string;
    if (input.kind === "mentorship") {
      const [m] = await this.db.select({ userId: p.userId }).from(p).where(and(eq(p.slug, input.mentor), eq(p.type, "mentor"), eq(p.status, "approved"))).limit(1);
      if (!m) throw notFound("Mentor");
      toUserId = m.userId;
      what = "would like you to be their mentor.";
    } else if (input.kind === "course") {
      const c = schema.mentorCourses;
      const [row] = await this.db.select({ userId: c.userId, title: c.title }).from(c).where(and(eq(c.id, input.courseId), eq(c.active, true))).limit(1);
      if (!row) throw notFound("Course");
      toUserId = row.userId;
      courseId = input.courseId;
      what = `would like to join your course “${row.title}”.`;
    } else {
      if (me.type !== "mentor") throw forbidden("This is only available to mentors.", "WRONG_MEMBER_TYPE");
      const fc = schema.fundingCalls;
      const [row] = await this.db.select({ userId: fc.userId, title: fc.title, open: fc.open, deadline: fc.deadline }).from(fc).where(eq(fc.id, input.fundingId)).limit(1);
      if (!row) throw notFound("Funding call");
      if (!row.open || (row.deadline && row.deadline < new Date().toISOString().slice(0, 10))) throw badRequest("This funding call is closed.", "CLOSED");
      toUserId = row.userId;
      fundingId = input.fundingId;
      what = `applied for your funding call “${row.title}”.`;
    }
    if (toUserId === userId) throw badRequest("You cannot send a request to yourself.");
    let row;
    try {
      [row] = await this.db.insert(rq).values({ kind: input.kind, fromUserId: userId, toUserId, courseId, fundingId, message: input.message }).returning();
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("You have already sent this request. You can follow it under Requests → Sent.", "ALREADY_REQUESTED");
      throw err;
    }
    await this.audit.record({ action: "member.request_sent", entityType: "member_request", entityId: row!.id, metadata: { kind: input.kind } });
    const [to] = await this.db.select({ email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, toUserId));
    if (to)
      await this.mail.queue(to.email, "member-request", { name: to.name, from: me.name, what, message: richToPlainText(input.message).slice(0, 500), subject: `New request from ${me.name}`, url: this.dashUrl("/requests") }, { dedupeKey: `request:${row!.id}` });
    return row;
  }

  async respond(userId: string, id: string, input: ResponseInput) {
    const [row] = await this.db.select().from(rq).where(eq(rq.id, id)).limit(1);
    if (!row || (row.toUserId !== userId && row.fromUserId !== userId)) throw notFound("Request");
    const recipient = row.toUserId === userId;
    if (recipient) {
      if (input.status === "withdrawn") throw badRequest("Only the person who sent a request can withdraw it.");
      // Pending requests can be answered; an accepted one can still be ended (declined) later.
      if (!(row.status === "pending" || (row.status === "accepted" && input.status === "declined"))) throw conflict("This request has already been answered.");
    } else {
      if (input.status !== "withdrawn") throw forbidden("Only the person who received a request can accept or decline it.");
      if (row.status !== "pending" && row.status !== "accepted") throw conflict("This request is already closed.");
    }
    const [updated] = await this.db
      .update(rq)
      .set({ status: input.status, reply: recipient ? input.reply || null : row.reply, respondedAt: new Date() })
      .where(eq(rq.id, id))
      .returning();
    await this.audit.record({ action: `member.request_${input.status}`, entityType: "member_request", entityId: id });
    if (recipient) {
      const [[from], [me]] = await Promise.all([
        this.db.select({ email: schema.user.email, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, row.fromUserId)),
        this.db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId)),
      ]);
      const what = row.kind === "mentorship" ? "mentorship" : row.kind === "course" ? "to join a course" : "a funding application";
      const answer = input.status === "accepted" ? "accepted" : row.status === "accepted" ? "ended" : "declined";
      if (from && me)
        await this.mail.queue(from.email, "member-request-answer", { name: from.name, from: me.name, answer, what, reply: richToPlainText(input.reply).slice(0, 500), subject: `${me.name} ${answer} your request`, url: this.dashUrl("/requests?box=out") }, { dedupeKey: `answer:${id}:${input.status}` });
    }
    return updated;
  }

  /* ------------------------------ connections ------------------------------- */

  /** People this member is connected with: accepted mentorships, plus mentor links kept from the old site. */
  private async connectedIds(me: Me) {
    const ids = new Set<string>();
    const accepted = await this.db
      .select({ from: rq.fromUserId, to: rq.toUserId })
      .from(rq)
      .where(and(eq(rq.kind, "mentorship"), eq(rq.status, "accepted"), or(eq(rq.fromUserId, me.userId), eq(rq.toUserId, me.userId))));
    for (const a of accepted) ids.add(a.from === me.userId ? a.to : a.from);
    if (me.type === "mentor" && me.legacyId) {
      const legacy = await this.db.select({ id: p.userId }).from(p).where(and(eq(p.legacyMentorId, me.legacyId), eq(p.status, "approved")));
      for (const l of legacy) ids.add(l.id);
    }
    if (me.legacyMentorId) {
      const [m] = await this.db.select({ id: p.userId }).from(p).where(and(eq(p.legacyId, me.legacyMentorId), eq(p.status, "approved")));
      if (m) ids.add(m.id);
    }
    ids.delete(me.userId);
    return ids;
  }

  private async people(ids: string[], withEmail: boolean) {
    if (!ids.length) return [];
    const rows = await this.db
      .select({ id: p.userId, firstName: p.firstName, lastName: p.lastName, type: p.type, slug: p.slug, position: p.position, affiliation: p.affiliation, country: p.country, email: schema.user.email, photoKey: schema.media.storageKey, legacyPhoto: p.legacyPhotoPath })
      .from(p)
      .innerJoin(schema.user, eq(schema.user.id, p.userId))
      .leftJoin(schema.media, eq(schema.media.id, p.photoId))
      .where(inArray(p.userId, ids));
    return rows
      .map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, type: r.type, slug: r.type === "mentor" ? r.slug : null, position: r.position, affiliation: r.affiliation, country: r.country, email: withEmail ? r.email : null, photoUrl: this.photo(r.photoKey, r.legacyPhoto) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async connections(userId: string) {
    const me = await this.profile(userId);
    const ids = await this.connectedIds(me);
    const connected = await this.people([...ids], true);
    // Members who share at least one area of expertise, most in common first.
    const shared = await this.db.execute<{ user_id: string; shared: number; type: string }>(sql`
      SELECT other.user_id, count(*)::int AS shared, mp.type
      FROM member_expertise mine
      JOIN member_expertise other ON other.expertise_id = mine.expertise_id AND other.user_id <> mine.user_id
      JOIN member_profiles mp ON mp.user_id = other.user_id AND mp.status = 'approved'
      WHERE mine.user_id = ${userId}
        AND (mp.type = 'mentee' OR mp.show_in_directory)
      GROUP BY other.user_id, mp.type
      ORDER BY shared DESC
      LIMIT 60`);
    const rows = shared.rows;
    const counts = new Map(rows.filter((r) => !ids.has(r.user_id)).map((r) => [r.user_id, Number(r.shared)]));
    const similar = (await this.people([...counts.keys()], false)).map((x) => ({ ...x, shared: counts.get(x.id) ?? 0 })).sort((a, b) => b.shared - a.shared || a.name.localeCompare(b.name));
    return {
      type: me.type,
      connected,
      similarMentors: similar.filter((s) => s.type === "mentor").slice(0, 24),
      similarMentees: similar.filter((s) => s.type === "mentee").slice(0, 24),
    };
  }

  /* -------------------------------- messages -------------------------------- */

  async messages(userId: string, box: Box, q: { page: number; pageSize: number }) {
    const otherUser = aliasedTable(schema.user, "other_user");
    const otherId = box === "in" ? msg.fromUserId : msg.toUserId;
    const where = box === "in" ? eq(msg.toUserId, userId) : eq(msg.fromUserId, userId);
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ m: msg, name: otherUser.name })
        .from(msg)
        .innerJoin(otherUser, eq(otherUser.id, otherId))
        .where(where)
        .orderBy(desc(msg.createdAt))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ n: count() }).from(msg).where(where),
    ]);
    return paged(
      rows.map((r) => ({ id: r.m.id, subject: r.m.subject, body: r.m.body, readAt: r.m.readAt, createdAt: r.m.createdAt, person: { id: box === "in" ? r.m.fromUserId : r.m.toUserId, name: r.name } })),
      Number(total!.n),
      q,
    );
  }

  /** Who this member may write to: the people they are connected with. */
  async recipients(userId: string) {
    const me = await this.profile(userId);
    return (await this.people([...(await this.connectedIds(me))], false)).map(({ id, name, type }) => ({ id, name, type }));
  }

  async sendMessage(userId: string, input: MessageInput) {
    const me = await this.profile(userId, { approved: true });
    const allowed = await this.connectedIds(me);
    const to = [...new Set(input.to)];
    if (to.some((id) => !allowed.has(id))) throw forbidden("You can only write to members you are connected with.", "NOT_CONNECTED");
    const rows = await this.db
      .insert(msg)
      .values(to.map((toUserId) => ({ fromUserId: userId, toUserId, subject: input.subject, body: input.body })))
      .returning({ id: msg.id, toUserId: msg.toUserId });
    await this.audit.record({ action: "member.message_sent", entityType: "member_message", entityId: rows[0]!.id, metadata: { recipients: rows.length } });
    const users = await this.db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name }).from(schema.user).where(inArray(schema.user.id, to));
    for (const u of users) await this.mail.queue(u.email, "member-message", { name: u.name, from: me.name, subject: input.subject, url: this.dashUrl("/messages") }, { dedupeKey: `msg:${rows.find((r) => r.toUserId === u.id)?.id}` });
    return { sent: rows.length };
  }

  async markRead(userId: string, id: string) {
    const [row] = await this.db
      .update(msg)
      .set({ readAt: new Date() })
      .where(and(eq(msg.id, id), eq(msg.toUserId, userId), isNull(msg.readAt)))
      .returning({ id: msg.id });
    return { updated: !!row };
  }

  async deleteMessage(userId: string, id: string) {
    // Recipients can clear their inbox; a sent message stays in the other person's inbox.
    const [row] = await this.db.delete(msg).where(and(eq(msg.id, id), eq(msg.toUserId, userId))).returning({ id: msg.id });
    if (!row) throw notFound("Message");
  }

  /* ------------------------- messages to the RiTECHS team ------------------------ */

  /** What this member has written to the team (Admin → Inbox), newest first. */
  async supportHistory(userId: string) {
    const [u] = await this.db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, userId));
    const c = schema.contactMessages;
    return this.db.select({ id: c.id, subject: c.subject, message: c.message, status: c.status, createdAt: c.createdAt }).from(c).where(eq(sql`lower(${c.email})`, u!.email.toLowerCase())).orderBy(desc(c.createdAt)).limit(30);
  }

  async sendSupport(userId: string, subject: string, message: string) {
    const me = await this.profile(userId);
    const c = schema.contactMessages;
    const [{ n }] = (await this.db
      .select({ n: count() })
      .from(c)
      .where(and(eq(sql`lower(${c.email})`, me.email.toLowerCase()), gte(c.createdAt, new Date(Date.now() - 24 * 3600 * 1000))))) as [{ n: number }];
    if (n >= 5) throw badRequest("You have sent 5 messages to the team today. Please wait for a reply.", "RATE_LIMITED");
    // The name and address come from the signed-in account, so staff can reply knowing who wrote.
    const [row] = await this.db.insert(c).values({ name: me.name, email: me.email, subject: `[${me.type === "mentor" ? "Mentor" : "Mentee"}] ${subject}`, message }).returning({ id: c.id });
    await this.audit.record({ action: "member.support_sent", entityType: "contact", entityId: row!.id });
    return { id: row!.id };
  }

  /* --------------------------- public profile extras ------------------------- */

  async publicExtras(userId: string) {
    const c = schema.mentorCourses;
    const r = schema.memberResources;
    const [courses, resources] = await Promise.all([
      this.db.select({ id: c.id, title: c.title, description: c.description, duration: c.duration, durationUnit: c.durationUnit, fee: c.fee, currency: c.currency }).from(c).where(and(eq(c.userId, userId), eq(c.active, true))).orderBy(desc(c.createdAt)),
      this.db
        .select({ id: r.id, title: r.title, url: r.url, key: schema.media.storageKey, mime: schema.media.mimeType })
        .from(r)
        .leftJoin(schema.media, eq(schema.media.id, r.mediaId))
        .where(and(eq(r.userId, userId), eq(r.isPublic, true)))
        .orderBy(desc(r.createdAt)),
    ]);
    return {
      courses,
      resources: resources.flatMap(({ key, mime, ...x }) => {
        const href = key ? this.storage.publicUrl(key) : x.url;
        return href ? [{ id: x.id, title: x.title, href, kind: key ? (mime === "application/pdf" ? "pdf" : "image") : "link" }] : [];
      }),
    };
  }
}
