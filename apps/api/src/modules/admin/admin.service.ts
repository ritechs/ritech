import { Inject, Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { fromNodeHeaders } from "better-auth/node";
import { and, count, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { AuthService } from "../../auth/auth.service.js";
import { ENV, type Env } from "../../config/env.js";
import { badRequest, forbidden, notFound } from "../../common/errors.js";
import { offsetOf, paged } from "../../common/http.js";
import { currentContext } from "../../common/request-context.js";
import { InjectDb } from "../../database/database.module.js";
import { AuditService } from "../../security/audit.service.js";
import { AuthThrottleService } from "../../security/auth-throttle.service.js";
import { hostCidr, inRange, parseRange } from "../../security/client-ip.js";
import { IpRulesService } from "../../security/ip-rules.service.js";

@Injectable()
export class AdminService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly authService: AuthService,
    private readonly ipRules: IpRulesService,
    private readonly throttle: AuthThrottleService,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------- dashboard ------------------------------- */

  async dashboard() {
    const one = async (q: Promise<unknown>) => Number(((await q) as { n: number }[])[0]?.n ?? 0);
    const p = schema.memberProfiles;
    const byTypeStatus = await this.db.select({ type: p.type, status: p.status, n: count() }).from(p).groupBy(p.type, p.status);
    return {
      members: byTypeStatus.map((r) => ({ ...r, n: Number(r.n) })),
      pendingMembershipChanges: await one(this.db.select({ n: count() }).from(schema.membershipChangeRequests).where(eq(schema.membershipChangeRequests.status, "pending"))),
      registrationsLast30Days: await one(this.db.select({ n: count() }).from(schema.registrations).where(sql`${schema.registrations.createdAt} > now() - interval '30 days'`)),
      newQuotes: await one(this.db.select({ n: count() }).from(schema.quoteRequests).where(eq(schema.quoteRequests.status, "new"))),
      newMessages: await one(this.db.select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "new"))),
      subscribers: await one(this.db.select({ n: count() }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.status, "confirmed"))),
      conferences: await one(this.db.select({ n: count() }).from(schema.conferences)),
      failedJobs: await one(this.db.select({ n: count() }).from(schema.jobs).where(eq(schema.jobs.status, "failed"))),
      ...(await this.dashboardExtras()),
    };
  }

  /** Content totals, 12-month trends and what is coming up, for the dashboard. */
  private async dashboardExtras() {
    const totals = (
      await this.db.execute<Record<string, number>>(sql`
        SELECT
          (SELECT count(*)::int FROM conferences WHERE status = 'published' AND coalesce(end_date, start_date) >= current_date) AS upcoming_conferences,
          (SELECT count(*)::int FROM events WHERE status = 'published' AND coalesce(ends_at, starts_at) >= now()) AS upcoming_events,
          (SELECT count(*)::int FROM events) AS events,
          (SELECT count(*)::int FROM registrations) AS registrations,
          (SELECT count(*)::int FROM news_posts WHERE status = 'published') AS news,
          (SELECT count(*)::int FROM publications WHERE status = 'published') AS publications,
          (SELECT count(*)::int FROM speakers) AS speakers,
          (SELECT count(*)::int FROM organisations WHERE active) AS organisations,
          (SELECT count(*)::int FROM quote_requests) AS quotes,
          (SELECT coalesce(sum(quoted_amount), 0)::float FROM quote_requests) AS quoted_amount,
          (SELECT count(DISTINCT country)::int FROM member_profiles WHERE status = 'approved' AND country IS NOT NULL) AS countries`)
    ).rows[0]!;
    const signups = (
      await this.db.execute<{ year: number; mentors: number; mentees: number }>(sql`
        SELECT y::int AS year,
          count(p.user_id) FILTER (WHERE p.type = 'mentor')::int AS mentors,
          count(p.user_id) FILTER (WHERE p.type = 'mentee')::int AS mentees
        FROM generate_series(
          (SELECT coalesce(min(extract(year FROM created_at))::int, extract(year FROM now())::int) FROM member_profiles),
          extract(year FROM now())::int) AS y
        LEFT JOIN member_profiles p ON extract(year FROM p.created_at)::int = y
        GROUP BY y ORDER BY y`)
    ).rows;
    const topCountries = (
      await this.db.execute<{ country: string; n: number }>(sql`
        SELECT country, count(*)::int AS n FROM member_profiles
        WHERE status = 'approved' AND country IS NOT NULL GROUP BY country ORDER BY n DESC, country LIMIT 6`)
    ).rows;
    const upcoming = (
      await this.db.execute<{ kind: string; id: string; title: string; label: string; starts: string; location: string | null; registrations: number }>(sql`
        (SELECT 'conference' AS kind, c.id::text, c.title, c.acronym AS label, c.start_date::text AS starts, c.location,
           (SELECT count(*)::int FROM registrations r WHERE r.conference_id = c.id) AS registrations
         FROM conferences c WHERE c.status = 'published' AND c.start_date >= current_date)
        UNION ALL
        (SELECT 'event', e.id::text, e.title, e.type::text, to_char(e.starts_at, 'YYYY-MM-DD'), e.location,
           (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id)
         FROM events e WHERE e.status = 'published' AND e.starts_at >= now())
        ORDER BY starts LIMIT 5`)
    ).rows;
    const recentRegistrations = (
      await this.db.execute<{ id: string; name: string; what: string; created_at: string; status: string }>(sql`
        SELECT r.id::text, r.name, coalesce(c.acronym, e.title) AS what, r.created_at, r.status
        FROM registrations r LEFT JOIN conferences c ON c.id = r.conference_id LEFT JOIN events e ON e.id = r.event_id
        ORDER BY r.created_at DESC LIMIT 6`)
    ).rows;
    return { totals, signups, topCountries, upcoming, recentRegistrations };
  }

  /* -------------------------------- security ------------------------------- */

  async securityOverview() {
    const r = await this.db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT count(*)::int FROM ip_rules WHERE action = 'block' AND (expires_at IS NULL OR expires_at > now())) AS active_blocks,
        (SELECT count(*)::int FROM ip_rules WHERE action = 'block' AND source = 'auto' AND created_at > now() - interval '24 hours') AS auto_blocks_24h,
        (SELECT count(*)::int FROM auth_throttle WHERE locked_until > now() AND key LIKE 'acct:%') AS locked_accounts,
        (SELECT count(*)::int FROM auth_throttle WHERE locked_until > now() AND key LIKE 'ip:%') AS locked_addresses,
        (SELECT count(*)::int FROM audit_logs WHERE action = 'auth.sign_in' AND created_at > now() - interval '24 hours') AS sign_ins_24h,
        (SELECT count(*)::int FROM audit_logs WHERE action IN ('auth.account_locked','auth.ip_locked') AND created_at > now() - interval '24 hours') AS lockouts_24h,
        (SELECT count(*)::int FROM "user" WHERE role = 'admin' AND coalesce(two_factor_enabled, false) = false) AS staff_without_2fa`);
    return r.rows[0];
  }

  async ipRuleList(q: { page: number; pageSize: number; active?: boolean | undefined }) {
    const t = schema.ipRules;
    const cond = q.active ? sql`(${t.expiresAt} IS NULL OR ${t.expiresAt} > now())` : undefined;
    const [items, [n]] = await Promise.all([
      this.db.select({ id: t.id, cidr: sql<string>`${t.cidr}::text`, action: t.action, source: t.source, reason: t.reason, expiresAt: t.expiresAt, createdBy: t.createdBy, hitCount: t.hitCount, lastHitAt: t.lastHitAt, createdAt: t.createdAt }).from(t).where(cond).orderBy(desc(t.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(t).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items, Number(n.total), q);
  }

  async ipRuleCreate(input: { cidr: string; action: "block" | "allow"; reason: string; expiresInHours?: number | null | undefined }, actorId: string) {
    const cidr = input.cidr.includes("/") ? input.cidr : hostCidr(input.cidr);
    let range;
    try {
      range = parseRange(cidr);
    } catch {
      throw badRequest("Enter a valid IP address or CIDR range, e.g. 203.0.113.7 or 203.0.113.0/24.", "INVALID_CIDR");
    }
    // Safety rails: never lock yourself out, and never block huge ranges by accident.
    const myIp = currentContext()?.ip;
    if (input.action === "block" && myIp && inRange(myIp, range)) throw badRequest("This range includes your own IP address, so it would lock you out.", "SELF_BLOCK");
    if (input.action === "block" && ((range[0].kind() === "ipv4" && range[1] < 16) || (range[0].kind() === "ipv6" && range[1] < 32)))
      throw badRequest("That range is too wide to block (smaller than /16 for IPv4 or /32 for IPv6).", "RANGE_TOO_WIDE");
    if (this.ipRules.resolver.isTrustedProxy(range[0].toString())) throw badRequest("That address is one of the site's own proxies.", "TRUSTED_PROXY");
    const row = await this.ipRules.addRule({
      cidr,
      action: input.action,
      reason: input.reason,
      expiresAt: input.expiresInHours ? new Date(Date.now() + input.expiresInHours * 3600_000) : null,
      source: "manual",
      createdBy: actorId,
    });
    await this.audit.record({ action: `security.ip_rule_${input.action}`, actorId, entityType: "ip", entityId: cidr, metadata: { reason: input.reason, expiresInHours: input.expiresInHours } });
    return row;
  }

  async ipRuleRemove(id: string, actorId: string) {
    const row = await this.ipRules.removeRule(id);
    if (!row) throw notFound("Rule");
    await this.audit.record({ action: "security.ip_rule_removed", actorId, entityType: "ip", entityId: String(row.cidr) });
  }

  async lockouts() {
    const rows = await this.throttle.listLocked();
    return rows.map((r) => ({ key: r.key, kind: r.key.startsWith("acct:") ? "account" : "address", lockedUntil: r.lockedUntil, lockCount: r.lockCount }));
  }

  async unlock(key: string, actorId: string) {
    if (!/^(acct:[a-f0-9]{64}|ip:[0-9a-f.:/]{3,50})$/.test(key)) throw badRequest("Unknown lock.");
    await this.throttle.unlock(key);
    await this.audit.record({ action: "security.lock_cleared", actorId, entityType: "lock", entityId: key.slice(0, 20) });
  }

  /** Unlock by email, for support requests ("I'm locked out"). */
  async unlockEmail(email: string, actorId: string) {
    const { accountKey } = await import("../../security/auth-throttle.service.js");
    await this.unlock(accountKey(email), actorId);
  }

  async auditLog(q: { page: number; pageSize: number; action?: string | undefined; actorId?: string | undefined; entityId?: string | undefined; from?: string | undefined; to?: string | undefined }) {
    const a = schema.auditLogs;
    const where: SQL[] = [];
    if (q.action) where.push(q.action.endsWith("*") ? sql`${a.action} LIKE ${q.action.slice(0, -1).replace(/[%_\\]/g, "\\$&") + "%"}` : eq(a.action, q.action));
    if (q.actorId) where.push(eq(a.actorId, q.actorId));
    if (q.entityId) where.push(eq(a.entityId, q.entityId));
    if (q.from) where.push(gte(a.createdAt, new Date(q.from)));
    if (q.to) where.push(lte(a.createdAt, new Date(q.to)));
    const cond = where.length ? and(...where) : undefined;
    const [items, [n]] = await Promise.all([
      this.db.select({ log: a, actorName: schema.user.name, actorEmail: schema.user.email }).from(a).leftJoin(schema.user, eq(schema.user.id, a.actorId)).where(cond).orderBy(desc(a.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(a).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(items.map((r) => ({ ...r.log, actorName: r.actorName, actorEmail: r.actorEmail })), Number(n.total), q);
  }

  async sessions(userId: string) {
    const s = schema.session;
    return this.db.select({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt, ipAddress: s.ipAddress, userAgent: s.userAgent, impersonatedBy: s.impersonatedBy }).from(s).where(and(eq(s.userId, userId), sql`${s.expiresAt} > now()`)).orderBy(desc(s.createdAt));
  }

  async revokeSession(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.session).where(eq(schema.session.id, id)).returning({ userId: schema.session.userId });
    if (!row) throw notFound("Session");
    await this.audit.record({ action: "security.session_revoked", actorId, entityType: "user", entityId: row.userId });
  }

  async revokeAllSessions(userId: string, actorId: string) {
    const rows = await this.db.delete(schema.session).where(eq(schema.session.userId, userId)).returning({ id: schema.session.id });
    await this.audit.record({ action: "security.sessions_revoked", actorId, entityType: "user", entityId: userId, metadata: { count: rows.length } });
    return { revoked: rows.length };
  }

  /* ---------------------------------- staff -------------------------------- */

  async staff() {
    const u = schema.user;
    return this.db.select({ id: u.id, name: u.name, email: u.email, role: u.role, twoFactorEnabled: u.twoFactorEnabled, banned: u.banned, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt }).from(u).where(inArray(u.role, ["admin", "editor"])).orderBy(u.name);
  }

  /**
   * Adds a staff member. With a password, the account can sign in straight
   * away (useful before email is set up; share it privately and ask them to
   * change it in My Account). Without one, they get a random password they
   * never see and a password-set email. An existing account is promoted and,
   * if a password is given, it replaces the old one.
   */
  async addStaff(input: { email: string; name: string; role: "admin" | "editor"; password?: string }, actorId: string, headers: IncomingHttpHeaders) {
    const u = schema.user;
    const [existing] = await this.db.select({ id: u.id }).from(u).where(sql`lower(${u.email}) = ${input.email}`).limit(1);
    let userId = existing?.id;
    if (!userId) {
      const created = await this.authService.auth.api.createUser({
        body: { email: input.email, name: input.name, password: input.password ?? randomBytes(24).toString("base64url"), role: input.role === "admin" ? "admin" : "user" },
        headers: fromNodeHeaders(headers),
      });
      userId = created.user.id;
      await this.db.update(u).set({ emailVerified: true, role: input.role }).where(eq(u.id, userId));
      if (!input.password) await this.authService.auth.api.requestPasswordReset({ body: { email: input.email, redirectTo: `${this.env.WEB_URL}/reset-password` } });
    } else {
      await this.db.update(u).set({ role: input.role, emailVerified: true, updatedAt: new Date() }).where(eq(u.id, userId));
      if (input.password) {
        const ctx = await this.authService.auth.$context;
        await this.db.update(schema.account).set({ password: await ctx.password.hash(input.password), updatedAt: new Date() }).where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")));
      }
      await this.db.delete(schema.session).where(eq(schema.session.userId, userId)); // re-login picks up the new role and its shorter session
    }
    await this.audit.record({ action: "staff.added", actorId, entityType: "user", entityId: userId, metadata: { role: input.role, passwordSet: !!input.password } });
    return { id: userId, role: input.role };
  }

  async setRole(userId: string, role: "admin" | "editor" | "user", actorId: string) {
    if (userId === actorId) throw forbidden("You cannot change your own role.");
    const u = schema.user;
    const [target] = await this.db.select({ role: u.role }).from(u).where(eq(u.id, userId));
    if (!target) throw notFound("User");
    if (target.role === "admin" && role !== "admin") {
      const [{ n }] = (await this.db.select({ n: count() }).from(u).where(eq(u.role, "admin"))) as [{ n: number }];
      if (Number(n) <= 1) throw forbidden("There must always be at least one administrator.");
    }
    await this.db.update(u).set({ role, updatedAt: new Date() }).where(eq(u.id, userId));
    await this.db.delete(schema.session).where(eq(schema.session.userId, userId));
    await this.audit.record({ action: "staff.role_changed", actorId, entityType: "user", entityId: userId, metadata: { from: target.role, to: role } });
    return { id: userId, role };
  }
}
