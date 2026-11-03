/**
 * Brute-force protection for sign-in, 2FA and password reset.
 *
 * Two counters per attempt: the account (hashed email) and the client
 * address. Crossing a threshold locks that key; every further lock within
 * 24h doubles in length, up to a cap. An address that keeps getting locked
 * is blocked from the whole API (IpRulesService.autoBlock).
 *
 * Locks apply to unknown emails exactly as to real ones, so responses never
 * reveal whether an account exists.
 */
import { Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { createHash } from "node:crypto";
import { and, desc, gt, inArray, sql } from "drizzle-orm";
import { InjectDb } from "../database/database.module.js";
import { ipKey } from "./client-ip.js";

export interface ThrottlePolicy {
  maxFailures: number;
  windowSec: number;
  baseLockSec: number;
  maxLockSec: number;
}

export const POLICIES = {
  account: { maxFailures: 5, windowSec: 15 * 60, baseLockSec: 15 * 60, maxLockSec: 24 * 3600 },
  ip: { maxFailures: 20, windowSec: 15 * 60, baseLockSec: 30 * 60, maxLockSec: 24 * 3600 },
} satisfies Record<string, ThrottlePolicy>;

/** After this many IP locks in 24h the address is blocked site-wide. */
export const IP_LOCKS_BEFORE_BAN = 3;

export const accountKey = (email: string) => `acct:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
export const addressKey = (ip: string) => `ip:${ipKey(ip)}`;

export interface FailureResult {
  locked: boolean;
  lockedUntil?: Date;
  lockCount: number;
  failures: number;
}

@Injectable()
export class AuthThrottleService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** The latest active lock among the keys, if any. */
  async lockedUntil(keys: string[]): Promise<Date | null> {
    const rows = await this.db
      .select({ lockedUntil: schema.authThrottle.lockedUntil })
      .from(schema.authThrottle)
      .where(and(inArray(schema.authThrottle.key, keys), gt(schema.authThrottle.lockedUntil, sql`now()`)))
      .orderBy(desc(schema.authThrottle.lockedUntil))
      .limit(1);
    return rows[0]?.lockedUntil ?? null;
  }

  async recordFailure(key: string, p: ThrottlePolicy): Promise<FailureResult> {
    const up = await this.db.execute<{ failures: number; lock_count: number }>(sql`
      INSERT INTO auth_throttle (key, failures, window_start, lock_count, updated_at) VALUES (${key}, 1, now(), 0, now())
      ON CONFLICT (key) DO UPDATE SET
        lock_count   = CASE WHEN auth_throttle.updated_at < now() - interval '24 hours' THEN 0 ELSE auth_throttle.lock_count END,
        failures     = CASE WHEN auth_throttle.window_start < now() - ${p.windowSec} * interval '1 second' THEN 1 ELSE auth_throttle.failures + 1 END,
        window_start = CASE WHEN auth_throttle.window_start < now() - ${p.windowSec} * interval '1 second' THEN now() ELSE auth_throttle.window_start END,
        updated_at   = now()
      RETURNING failures, lock_count`);
    const r = up.rows[0]!;
    if (r.failures < p.maxFailures) return { locked: false, failures: r.failures, lockCount: r.lock_count };

    // Row lock serialises concurrent requests: only one of them applies the lock.
    const lock = await this.db.execute<{ locked_until: Date; lock_count: number }>(sql`
      UPDATE auth_throttle SET
        locked_until = now() + LEAST(${p.baseLockSec} * power(2, lock_count), ${p.maxLockSec}) * interval '1 second',
        lock_count = lock_count + 1, failures = 0, window_start = now(), updated_at = now()
      WHERE key = ${key} AND failures >= ${p.maxFailures}
      RETURNING locked_until, lock_count`);
    const l = lock.rows[0];
    return l ? { locked: true, lockedUntil: new Date(l.locked_until), lockCount: l.lock_count, failures: 0 } : { locked: false, failures: 0, lockCount: r.lock_count };
  }

  /** A successful sign-in clears the failure count (but not the escalation history). */
  async recordSuccess(key: string) {
    await this.db.execute(sql`UPDATE auth_throttle SET failures = 0, window_start = now() WHERE key = ${key}`);
  }

  async unlock(key: string) {
    await this.db.execute(sql`DELETE FROM auth_throttle WHERE key = ${key}`);
  }

  async listLocked(limit = 200) {
    return this.db
      .select()
      .from(schema.authThrottle)
      .where(gt(schema.authThrottle.lockedUntil, sql`now()`))
      .orderBy(desc(schema.authThrottle.lockedUntil))
      .limit(limit);
  }

  async purgeStale() {
    await this.db.execute(sql`DELETE FROM auth_throttle WHERE updated_at < now() - interval '7 days' AND (locked_until IS NULL OR locked_until < now())`);
  }
}
