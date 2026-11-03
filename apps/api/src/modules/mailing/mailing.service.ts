import { isUniqueViolation } from "../content/conferences.service.js";
import { Inject, Injectable } from "@nestjs/common";
import { schema, type CampaignAudience, type Database } from "@ritechs/db";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { ENV, type Env } from "../../config/env.js";
import { badRequest, conflict, notFound } from "../../common/errors.js";
import { offsetOf, paged } from "../../common/http.js";
import { sanitizeRichText } from "../../common/sanitize.js";
import { InjectDb } from "../../database/database.module.js";
import { JobsService } from "../../jobs/jobs.service.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { InboxService } from "../inbox/inbox.service.js";

const MAX_RECIPIENTS = 25_000;
/** Emails per second handed to the SMTP server; keeps us inside provider limits and off spam lists. */
const SEND_RATE = 8;

@Injectable()
export class MailingService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobsService,
    private readonly mail: MailService,
    private readonly inbox: InboxService,
    private readonly audit: AuditService,
  ) {
    jobs.register("campaign.send", (p) => this.expand(String(p.campaignId)));
    jobs.register("campaign.deliver", (p) => this.deliverOne(String(p.campaignId), String(p.email)));
  }

  /* --------------------------------- groups -------------------------------- */

  async groups() {
    const g = schema.mailGroups;
    return this.db
      .select({ id: g.id, name: g.name, description: g.description, createdAt: g.createdAt, members: sql<number>`(SELECT count(*)::int FROM mail_group_members m WHERE m.group_id = ${g.id})` })
      .from(g)
      .orderBy(asc(g.name));
  }

  async saveGroup(input: { name: string; description?: string | null | undefined }, actorId: string, id?: string) {
    try {
      const [row] = id
        ? await this.db.update(schema.mailGroups).set(input).where(eq(schema.mailGroups.id, id)).returning()
        : await this.db.insert(schema.mailGroups).values({ ...input, createdBy: actorId }).returning();
      if (!row) throw notFound("Group");
      await this.audit.record({ action: id ? "mail_group.updated" : "mail_group.created", actorId, entityType: "mail_group", entityId: row.id });
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("A group with this name already exists.");
      throw err;
    }
  }

  async removeGroup(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.mailGroups).where(eq(schema.mailGroups.id, id)).returning({ id: schema.mailGroups.id });
    if (!row) throw notFound("Group");
    await this.audit.record({ action: "mail_group.deleted", actorId, entityType: "mail_group", entityId: id });
  }

  async groupMembers(groupId: string, q: { page: number; pageSize: number }) {
    const m = schema.mailGroupMembers;
    const [items, [t]] = await Promise.all([
      this.db.select().from(m).where(eq(m.groupId, groupId)).orderBy(asc(m.email)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(m).where(eq(m.groupId, groupId)) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(t.total), q);
  }

  async addMembers(groupId: string, people: { email: string; name?: string | undefined }[], actorId: string) {
    const [g] = await this.db.select({ id: schema.mailGroups.id }).from(schema.mailGroups).where(eq(schema.mailGroups.id, groupId));
    if (!g) throw notFound("Group");
    const rows = await this.db
      .insert(schema.mailGroupMembers)
      .values(people.map((p) => ({ groupId, email: p.email, name: p.name ?? null })))
      .onConflictDoNothing()
      .returning({ id: schema.mailGroupMembers.id });
    await this.audit.record({ action: "mail_group.members_added", actorId, entityType: "mail_group", entityId: groupId, metadata: { added: rows.length } });
    return { added: rows.length };
  }

  async removeMember(groupId: string, memberId: string, actorId: string) {
    await this.db.delete(schema.mailGroupMembers).where(and(eq(schema.mailGroupMembers.groupId, groupId), eq(schema.mailGroupMembers.id, memberId)));
    await this.audit.record({ action: "mail_group.member_removed", actorId, entityType: "mail_group", entityId: groupId });
  }

  /* -------------------------------- campaigns ------------------------------ */

  async campaigns(q: { page: number; pageSize: number }) {
    const c = schema.emailCampaigns;
    const [items, [t]] = await Promise.all([
      this.db.select({ id: c.id, subject: c.subject, status: c.status, audience: c.audience, recipientCount: c.recipientCount, sentCount: c.sentCount, failedCount: c.failedCount, createdAt: c.createdAt, queuedAt: c.queuedAt, finishedAt: c.finishedAt }).from(c).orderBy(desc(c.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(c) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(t.total), q);
  }

  async saveCampaign(input: { subject: string; bodyHtml: string; audience: CampaignAudience }, actorId: string, id?: string) {
    const values = { subject: input.subject, bodyHtml: sanitizeRichText(input.bodyHtml), audience: input.audience };
    if (id) {
      const [row] = await this.db.update(schema.emailCampaigns).set(values).where(and(eq(schema.emailCampaigns.id, id), eq(schema.emailCampaigns.status, "draft"))).returning();
      if (!row) throw conflict("Only draft campaigns can be edited.");
      return row;
    }
    const [row] = await this.db.insert(schema.emailCampaigns).values({ ...values, createdBy: actorId }).returning();
    await this.audit.record({ action: "campaign.created", actorId, entityType: "campaign", entityId: row!.id });
    return row!;
  }

  async send(id: string, actorId: string) {
    const [row] = await this.db
      .update(schema.emailCampaigns)
      .set({ status: "queued", queuedAt: new Date() })
      .where(and(eq(schema.emailCampaigns.id, id), eq(schema.emailCampaigns.status, "draft")))
      .returning({ id: schema.emailCampaigns.id });
    if (!row) throw conflict("This campaign has already been sent or does not exist.");
    await this.jobs.enqueue("campaign.send", { campaignId: id }, { dedupeKey: `campaign:${id}`, maxAttempts: 3 });
    await this.audit.record({ action: "campaign.sent", actorId, entityType: "campaign", entityId: id });
    return { status: "queued" };
  }

  /** Resolves the audience to unique addresses and queues one email each, paced at SEND_RATE per second. */
  private async expand(campaignId: string) {
    const [c] = await this.db.select().from(schema.emailCampaigns).where(eq(schema.emailCampaigns.id, campaignId));
    if (!c || c.status !== "queued") return;
    const emails = new Set<string>();
    const a = c.audience;
    if (a.memberTypes?.length) {
      const rows = await this.db
        .select({ email: schema.user.email })
        .from(schema.memberProfiles)
        .innerJoin(schema.user, eq(schema.user.id, schema.memberProfiles.userId))
        .where(and(inArray(schema.memberProfiles.type, a.memberTypes), eq(schema.memberProfiles.status, "approved"), eq(schema.user.emailVerified, true)));
      rows.forEach((r) => emails.add(r.email.toLowerCase()));
    }
    if (a.groupIds?.length) {
      const rows = await this.db.select({ email: schema.mailGroupMembers.email }).from(schema.mailGroupMembers).where(inArray(schema.mailGroupMembers.groupId, a.groupIds));
      rows.forEach((r) => emails.add(r.email.toLowerCase()));
    }
    if (a.newsletter) {
      const rows = await this.db.select({ email: schema.newsletterSubscribers.email }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.status, "confirmed"));
      rows.forEach((r) => emails.add(r.email.toLowerCase()));
    }
    // People who unsubscribed from the newsletter are never emailed by a campaign.
    const unsub = await this.db.select({ email: schema.newsletterSubscribers.email }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.status, "unsubscribed"));
    unsub.forEach((r) => emails.delete(r.email.toLowerCase()));

    const list = [...emails].slice(0, MAX_RECIPIENTS);
    await this.db.update(schema.emailCampaigns).set({ status: "sending", recipientCount: list.length }).where(eq(schema.emailCampaigns.id, campaignId));
    const start = Date.now();
    for (let i = 0; i < list.length; i += 500) {
      await this.db
        .insert(schema.jobs)
        .values(list.slice(i, i + 500).map((email, j) => ({ queue: "campaign.deliver", payload: { campaignId, email }, runAt: new Date(start + Math.floor((i + j) / SEND_RATE) * 1000), dedupeKey: `campaign:${campaignId}:${email}` })))
        .onConflictDoNothing();
    }
    if (!list.length) await this.db.update(schema.emailCampaigns).set({ status: "sent", finishedAt: new Date() }).where(eq(schema.emailCampaigns.id, campaignId));
  }

  private async deliverOne(campaignId: string, email: string) {
    const [c] = await this.db.select().from(schema.emailCampaigns).where(eq(schema.emailCampaigns.id, campaignId));
    if (!c || c.status === "cancelled") return;
    const [sub] = await this.db.select({ status: schema.newsletterSubscribers.status }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, email));
    if (sub?.status === "unsubscribed") return;
    const unsubscribeUrl = sub?.status === "confirmed" ? await this.inbox.unsubscribeUrlFor(email) : `${this.env.WEB_URL}/contact`;
    try {
      await this.mail.deliver(email, "campaign", { subject: c.subject, bodyHtml: c.bodyHtml, bodyText: c.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), unsubscribeUrl });
      await this.db.execute(sql`UPDATE email_campaigns SET sent_count = sent_count + 1, status = CASE WHEN sent_count + 1 + failed_count >= recipient_count THEN 'sent'::campaign_status ELSE status END, finished_at = CASE WHEN sent_count + 1 + failed_count >= recipient_count THEN now() ELSE finished_at END WHERE id = ${campaignId}`);
    } catch (err) {
      await this.db.execute(sql`UPDATE email_campaigns SET failed_count = failed_count + 1 WHERE id = ${campaignId}`);
      throw err;
    }
  }

  async cancel(id: string, actorId: string) {
    const [row] = await this.db.update(schema.emailCampaigns).set({ status: "cancelled", finishedAt: new Date() }).where(and(eq(schema.emailCampaigns.id, id), inArray(schema.emailCampaigns.status, ["draft", "queued", "sending"]))).returning({ id: schema.emailCampaigns.id });
    if (!row) throw badRequest("This campaign can no longer be cancelled.");
    await this.db.execute(sql`DELETE FROM jobs WHERE queue = 'campaign.deliver' AND status = 'queued' AND payload->>'campaignId' = ${id}`);
    await this.audit.record({ action: "campaign.cancelled", actorId, entityType: "campaign", entityId: id });
    return { status: "cancelled" };
  }
}
