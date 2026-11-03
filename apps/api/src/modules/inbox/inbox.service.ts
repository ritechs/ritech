import { Inject, Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import type { contactSchema, quoteRequestSchema } from "@ritechs/shared";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { z } from "zod";
import { ENV, type Env } from "../../config/env.js";
import { badRequest, notFound } from "../../common/errors.js";
import { offsetOf, paged } from "../../common/http.js";
import { InjectDb } from "../../database/database.module.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { toE164 } from "../members/members.service.js";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const ACCEPTED = { status: "received", message: "Thank you — we have received your message." };

/**
 * Public forms. Bots are filtered by a honeypot field (`website`, invisible
 * to people): a filled honeypot gets the normal success answer but nothing is
 * stored, so the bot learns nothing.
 */
@Injectable()
export class InboxService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async contact(input: z.infer<typeof contactSchema>) {
    if (input.website) return ACCEPTED;
    await this.db.insert(schema.contactMessages).values({ name: input.name, email: input.email, subject: input.subject, message: input.message });
    return ACCEPTED;
  }

  async quote(input: z.infer<typeof quoteRequestSchema>) {
    if (input.website) return ACCEPTED;
    await this.db.insert(schema.quoteRequests).values({
      name: input.name,
      email: input.email,
      phoneE164: input.phone ? toE164(input.phone) : null,
      service: input.service,
      referenceStyle: input.referenceStyle ?? null,
      wordCount: input.wordCount ?? null,
      details: input.details,
    });
    return ACCEPTED;
  }

  /* -------------------------- newsletter (double opt-in) -------------------------- */

  async subscribe(email: string, honeypot: string | undefined, source = "website") {
    const generic = { status: "pending", message: "Please check your inbox to confirm your subscription." };
    if (honeypot) return generic;
    const n = schema.newsletterSubscribers;
    const [existing] = await this.db.select().from(n).where(eq(n.email, email)).limit(1);
    if (existing?.status === "confirmed") return generic; // no hint that the address is already subscribed
    const confirm = token();
    const values = { tokenHash: sha256(confirm), tokenExpiresAt: new Date(Date.now() + 48 * 3600_000), status: "pending" as const, source };
    if (existing) await this.db.update(n).set(values).where(eq(n.id, existing.id));
    else await this.db.insert(n).values({ email, ...values, unsubscribeHash: sha256(token()) });
    await this.mail.queue(email, "newsletter-confirm", { url: `${this.env.WEB_URL}/newsletter/confirm?token=${confirm}` }, { dedupeKey: `newsletter:${sha256(email)}:${new Date().toISOString().slice(0, 13)}` });
    return generic;
  }

  async confirm(tok: string) {
    const n = schema.newsletterSubscribers;
    const unsubscribe = token();
    const [row] = await this.db
      .update(n)
      .set({ status: "confirmed", confirmedAt: new Date(), tokenHash: null, tokenExpiresAt: null, unsubscribeHash: sha256(unsubscribe) })
      .where(and(eq(n.tokenHash, sha256(tok)), sql`${n.tokenExpiresAt} > now()`))
      .returning({ id: n.id });
    if (!row) throw badRequest("This confirmation link is invalid or has expired. Please subscribe again.", "INVALID_TOKEN");
    return { status: "confirmed" };
  }

  async unsubscribe(tok: string) {
    const n = schema.newsletterSubscribers;
    await this.db.update(n).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(n.unsubscribeHash, sha256(tok)));
    return { status: "unsubscribed" }; // same answer for unknown tokens
  }

  /** Issues a fresh unsubscribe token for a campaign email (only the hash is stored). */
  async unsubscribeUrlFor(email: string) {
    const t = token();
    await this.db.update(schema.newsletterSubscribers).set({ unsubscribeHash: sha256(t) }).where(eq(schema.newsletterSubscribers.email, email));
    return `${this.env.WEB_URL}/newsletter/unsubscribe?token=${t}`;
  }

  /* --------------------------------- admin --------------------------------- */

  async list(kind: "contact" | "quotes" | "subscribers", q: { page: number; pageSize: number; status?: string | undefined }) {
    const table = kind === "contact" ? schema.contactMessages : kind === "quotes" ? schema.quoteRequests : schema.newsletterSubscribers;
    const cond: SQL | undefined = q.status ? eq(table.status, q.status as never) : undefined;
    const [items, [t]] = await Promise.all([
      kind === "subscribers"
        ? this.db.select({ id: schema.newsletterSubscribers.id, email: schema.newsletterSubscribers.email, status: schema.newsletterSubscribers.status, source: schema.newsletterSubscribers.source, confirmedAt: schema.newsletterSubscribers.confirmedAt, createdAt: schema.newsletterSubscribers.createdAt }).from(schema.newsletterSubscribers).where(cond).orderBy(desc(schema.newsletterSubscribers.createdAt)).limit(q.pageSize).offset(offsetOf(q))
        : this.db.select().from(table).where(cond).orderBy(desc(table.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(table).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items as unknown[], Number(t.total), q);
  }

  async updateContact(id: string, status: "new" | "read" | "archived", actorId: string) {
    const [row] = await this.db.update(schema.contactMessages).set({ status }).where(eq(schema.contactMessages.id, id)).returning({ id: schema.contactMessages.id });
    if (!row) throw notFound("Message");
    await this.audit.record({ action: "contact.status_changed", actorId, entityType: "contact", entityId: id, metadata: { status } });
    return row;
  }

  /** Permanently removes a contact message or quote request (spam, duplicates, test entries). */
  async remove(kind: "contact" | "quotes", id: string, actorId: string) {
    const table = kind === "contact" ? schema.contactMessages : schema.quoteRequests;
    const [row] = await this.db.delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (!row) throw notFound(kind === "contact" ? "Message" : "Quote request");
    await this.audit.record({ action: kind === "contact" ? "contact.deleted" : "quote.deleted", actorId, entityType: kind === "contact" ? "contact" : "quote", entityId: id });
  }

  async updateQuote(id: string, input: { status: "new" | "quoted" | "accepted" | "declined" | "closed"; quotedAmount?: string | null | undefined; currency?: string | undefined }, actorId: string) {
    const [row] = await this.db
      .update(schema.quoteRequests)
      .set({ status: input.status, quotedAmount: input.quotedAmount ?? null, ...(input.currency ? { currency: input.currency } : {}), handledBy: actorId })
      .where(eq(schema.quoteRequests.id, id))
      .returning();
    if (!row) throw notFound("Quote request");
    await this.audit.record({ action: "quote.updated", actorId, entityType: "quote", entityId: id, metadata: { status: input.status } });
    return row;
  }
}
