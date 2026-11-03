/**
 * Fixed-window rate limiting with two layers:
 *  1. an in-memory pre-filter per process, which absorbs floods from a single
 *     address without touching the database;
 *  2. a shared counter in Postgres (UNLOGGED table, one atomic upsert), so the
 *     limit holds across all API instances.
 */
import { Injectable } from "@nestjs/common";
import type { Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { InjectDb } from "../database/database.module.js";

export interface RateResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

const LOCAL_MAX_KEYS = 50_000;

@Injectable()
export class RateLimitService {
  private local = new Map<string, { count: number; resetAt: number }>();

  constructor(@InjectDb() private readonly db: Database) {}

  /** Cheap per-process check. A process alone may not exceed the global limit, so this never over-blocks. */
  private localHit(key: string, limit: number, windowSec: number): boolean {
    const now = Date.now();
    let e = this.local.get(key);
    if (!e || e.resetAt <= now) {
      if (this.local.size >= LOCAL_MAX_KEYS) this.pruneLocal(now);
      e = { count: 0, resetAt: now + windowSec * 1000 };
      this.local.set(key, e);
    }
    e.count++;
    return e.count <= limit;
  }

  private pruneLocal(now: number) {
    for (const [k, v] of this.local) if (v.resetAt <= now) this.local.delete(k);
    // Still full of live keys (a distributed flood): drop the oldest half.
    if (this.local.size >= LOCAL_MAX_KEYS) {
      let i = 0;
      for (const k of this.local.keys()) if (i++ < LOCAL_MAX_KEYS / 2) this.local.delete(k);
    }
  }

  async consume(key: string, limit: number, windowSec: number): Promise<RateResult> {
    if (!this.localHit(key, limit, windowSec)) {
      const e = this.local.get(key)!;
      return { allowed: false, limit, remaining: 0, resetAt: new Date(e.resetAt) };
    }
    const res = await this.db.execute<{ count: number; reset_at: Date }>(sql`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, now() + ${windowSec} * interval '1 second')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`);
    const row = res.rows[0]!;
    const count = Number(row.count);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt: new Date(row.reset_at) };
  }

  async reset(key: string) {
    this.local.delete(key);
    await this.db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
  }

  async purgeExpired() {
    await this.db.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 minute'`);
    this.pruneLocal(Date.now());
  }
}
