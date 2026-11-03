/**
 * Security and infrastructure tables. These replace Redis: rate-limit
 * counters, login throttling and the background job queue all live in
 * Postgres, so the system needs one stateful service instead of two.
 */
import { sql } from "drizzle-orm";
import { bigserial, customType, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Postgres `cidr`: a single address (/32, /128) or a network. Matched with `>>=`. */
const cidr = customType<{ data: string }>({ dataType: () => "cidr" });

export const ipRuleAction = pgEnum("ip_rule_action", ["block", "allow"]);
export const ipRuleSource = pgEnum("ip_rule_source", ["manual", "auto"]);

/**
 * IP allow/block rules. `allow` wins over `block` (e.g. a university NAT).
 * Auto rules are created by the brute-force and abuse detectors and expire.
 */
export const ipRules = pgTable(
  "ip_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cidr: cidr("cidr").notNull(),
    action: ipRuleAction("action").notNull(),
    source: ipRuleSource("source").notNull().default("manual"),
    reason: text("reason").notNull(),
    /** Null = permanent. */
    expiresAt: ts("expires_at"),
    createdBy: text("created_by"),
    hitCount: integer("hit_count").notNull().default(0),
    lastHitAt: ts("last_hit_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ip_rules_cidr_action_idx").on(t.cidr, t.action), index("ip_rules_expires_idx").on(t.expiresAt)],
);

/**
 * Failed-login counters. Keys are hashed (`ip:<addr>`, `acct:<sha256(email)>`)
 * so the table holds no plain email addresses. Each lock doubles in length
 * (`lock_count`) up to a cap, which makes slow brute force impractical.
 */
export const authThrottle = pgTable(
  "auth_throttle",
  {
    key: text("key").primaryKey(),
    failures: integer("failures").notNull().default(0),
    windowStart: ts("window_start").notNull().defaultNow(),
    lockedUntil: ts("locked_until"),
    lockCount: smallint("lock_count").notNull().default(0),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("auth_throttle_updated_idx").on(t.updatedAt)],
);

/**
 * Fixed-window request counters for the API rate limiter. Made UNLOGGED in a
 * migration: faster writes, and losing counters on a crash is harmless.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: ts("reset_at").notNull(),
  },
  (t) => [index("rate_limits_reset_idx").on(t.resetAt)],
);

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

/**
 * Background jobs (emails, campaign batches, image processing). Workers claim
 * rows with `FOR UPDATE SKIP LOCKED`, so several workers never take the same job.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    queue: text("queue").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatus("status").notNull().default("queued"),
    runAt: ts("run_at").notNull().defaultNow(),
    attempts: smallint("attempts").notNull().default(0),
    maxAttempts: smallint("max_attempts").notNull().default(5),
    lockedAt: ts("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    /** Optional de-duplication key: a second job with the same key is ignored while the first is pending. */
    dedupeKey: text("dedupe_key"),
    createdAt: ts("created_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
  },
  (t) => [
    index("jobs_claim_idx").on(t.status, t.runAt).where(sql`status = 'queued'`),
    index("jobs_running_idx").on(t.lockedAt).where(sql`status = 'running'`),
    uniqueIndex("jobs_dedupe_idx").on(t.dedupeKey).where(sql`dedupe_key IS NOT NULL AND status IN ('queued','running')`),
  ],
);
