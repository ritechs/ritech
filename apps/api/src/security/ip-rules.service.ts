/**
 * IP allow/block rules. Active rules are cached in memory and refreshed every
 * few seconds, so checking an address costs no database round trip; with
 * several API instances a new rule takes effect everywhere within REFRESH_MS.
 */
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { ENV, type Env } from "../config/env.js";
import { InjectDb } from "../database/database.module.js";
import { JobsService } from "../jobs/jobs.service.js";
import { AuditService } from "./audit.service.js";
import { ClientIpResolver, hostCidr, inRange, parseRange } from "./client-ip.js";

const REFRESH_MS = 10_000;
/** With DB_SCALE_TO_ZERO (one API instance): rules changed by this process apply at once anyway. */
const IDLE_REFRESH_MS = 15 * 60_000;
/** Escalating auto-ban lengths for the same address within 30 days. */
const AUTO_BAN_STEPS_MIN = [60, 6 * 60, 24 * 60, 7 * 24 * 60];

interface CachedRule {
  id: string;
  range: ReturnType<typeof parseRange>;
  action: "block" | "allow";
}

export type IpVerdict = { blocked: false; allowListed: boolean } | { blocked: true; ruleId: string };

@Injectable()
export class IpRulesService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("IpRules");
  private rules: CachedRule[] = [];
  private hits = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  readonly resolver: ClientIpResolver;

  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) env: Env,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
  ) {
    this.resolver = new ClientIpResolver(env.TRUSTED_PROXIES, env.CLIENT_IP_HEADER);
    this.alertTo = env.SECURITY_ALERT_EMAIL;
    this.refreshMs = env.DB_SCALE_TO_ZERO ? IDLE_REFRESH_MS : REFRESH_MS;
  }
  private readonly refreshMs: number;
  private readonly alertTo: string | undefined;

  async onModuleInit() {
    await this.refresh();
    this.timer = setInterval(() => void this.tick(), this.refreshMs);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.flushHits();
  }

  private async tick() {
    await Promise.allSettled([this.refresh(), this.flushHits()]);
  }

  async refresh() {
    try {
      const rows = await this.db.execute<{ id: string; cidr: string; action: "block" | "allow" }>(
        sql`SELECT id, cidr::text AS cidr, action FROM ip_rules WHERE expires_at IS NULL OR expires_at > now()`,
      );
      this.rules = rows.rows.map((r) => ({ id: r.id, action: r.action, range: parseRange(r.cidr) }));
    } catch (err) {
      // Keep the last good list rather than failing open or closed.
      this.log.error({ err }, "could not refresh IP rules");
    }
  }

  check(ip: string): IpVerdict {
    let block: CachedRule | undefined;
    for (const r of this.rules) {
      if (!inRange(ip, r.range)) continue;
      if (r.action === "allow") return { blocked: false, allowListed: true };
      block ??= r;
    }
    if (!block) return { blocked: false, allowListed: false };
    this.hits.set(block.id, (this.hits.get(block.id) ?? 0) + 1);
    return { blocked: true, ruleId: block.id };
  }

  private async flushHits() {
    if (!this.hits.size) return;
    const batch = [...this.hits];
    this.hits = new Map();
    const values = sql.join(
      batch.map(([id, n]) => sql`(${id}::uuid, ${n}::int)`),
      sql`, `,
    );
    await this.db
      .execute(sql`UPDATE ip_rules r SET hit_count = r.hit_count + v.n, last_hit_at = now() FROM (VALUES ${values}) AS v(id, n) WHERE r.id = v.id`)
      .catch((err) => this.log.warn({ err }, "could not record IP rule hits"));
  }

  async addRule(input: { cidr: string; action: "block" | "allow"; reason: string; expiresAt: Date | null; source: "manual" | "auto"; createdBy: string | null }) {
    const cidr = input.cidr.includes("/") ? input.cidr : hostCidr(input.cidr);
    parseRange(cidr); // throws on invalid input
    const [row] = await this.db
      .insert(schema.ipRules)
      .values({ ...input, cidr })
      .onConflictDoUpdate({
        target: [schema.ipRules.cidr, schema.ipRules.action],
        set: { reason: input.reason, expiresAt: input.expiresAt, source: input.source, createdBy: input.createdBy },
      })
      .returning();
    await this.refresh();
    return row!;
  }

  async removeRule(id: string) {
    const [row] = await this.db.delete(schema.ipRules).where(sql`${schema.ipRules.id} = ${id}`).returning();
    await this.refresh();
    return row;
  }

  /**
   * Temporarily block an abusive address. Never blocks our own proxies or
   * allow-listed networks; repeat offenders get longer bans.
   */
  async autoBlock(ip: string, reason: string) {
    if (this.resolver.isTrustedProxy(ip) || this.isAllowListed(ip)) return null;
    const cidr = hostCidr(ip);
    const prior = await this.db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'security.ip_auto_blocked' AND entity_id = ${cidr} AND created_at > now() - interval '30 days'`,
    );
    const step = Math.min(prior.rows[0]?.n ?? 0, AUTO_BAN_STEPS_MIN.length - 1);
    const minutes = AUTO_BAN_STEPS_MIN[step]!;
    const expiresAt = new Date(Date.now() + minutes * 60_000);
    const rule = await this.addRule({ cidr, action: "block", reason, expiresAt, source: "auto", createdBy: null });
    await this.audit.record({ action: "security.ip_auto_blocked", actorId: null, entityType: "ip", entityId: cidr, metadata: { reason, minutes } });
    this.log.warn({ cidr, reason, minutes }, "IP auto-blocked");
    if (this.alertTo)
      await this.jobs.enqueue(
        "email",
        { to: this.alertTo, template: "security-alert", data: { title: "IP address blocked", lines: [`${cidr} was blocked for ${minutes} minutes.`, `Reason: ${reason}`] } },
        { dedupeKey: `alert:block:${cidr}` },
      );
    return rule;
  }

  private isAllowListed(ip: string) {
    return this.rules.some((r) => r.action === "allow" && inRange(ip, r.range));
  }
}
