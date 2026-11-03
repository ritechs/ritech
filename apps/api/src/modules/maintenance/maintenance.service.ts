import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { ENV, type Env } from "../../config/env.js";
import { InjectDb } from "../../database/database.module.js";
import { JobsService } from "../../jobs/jobs.service.js";
import { AuthThrottleService } from "../../security/auth-throttle.service.js";
import { RateLimitService } from "../../security/rate-limit.service.js";

/**
 * Housekeeping. Each task takes a transaction-level advisory lock, so with
 * several instances only one of them runs it.
 */
@Injectable()
export class MaintenanceService {
  private readonly log = new Logger("Maintenance");
  /** With DB_SCALE_TO_ZERO the 5-minute tasks run every 30 minutes, so the database can pause. */
  private lastFrequent = 0;

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly limiter: RateLimitService,
    private readonly throttle: AuthThrottleService,
    private readonly jobs: JobsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private async exclusive(lockId: number, fn: () => Promise<void>) {
    const r = await this.db.execute<{ ok: boolean }>(sql`SELECT pg_try_advisory_lock(${lockId}) AS ok`);
    if (!r.rows[0]?.ok) return;
    try {
      await fn();
    } catch (err) {
      this.log.error({ err, lockId }, "maintenance task failed");
    } finally {
      await this.db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async frequent() {
    if (this.env.DB_SCALE_TO_ZERO && Date.now() - this.lastFrequent < 29 * 60_000) return;
    this.lastFrequent = Date.now();
    await this.limiter.purgeExpired();
    await this.exclusive(1001, async () => {
      await this.jobs.maintenance();
      await this.db.execute(sql`DELETE FROM ip_rules WHERE source = 'auto' AND expires_at < now() - interval '1 day'`);
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async hourly() {
    await this.exclusive(1002, async () => {
      await this.throttle.purgeStale();
      await this.db.execute(sql`DELETE FROM session WHERE expires_at < now()`);
      await this.db.execute(sql`DELETE FROM verification WHERE expires_at < now()`);
      await this.db.execute(sql`DELETE FROM newsletter_subscribers WHERE status = 'pending' AND created_at < now() - interval '7 days'`);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async daily() {
    await this.exclusive(1003, async () => {
      // Audit retention: the trigger allows deleting rows older than 400 days only inside this opt-in transaction.
      await this.db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ritechs.audit_purge = 'on'`);
        await tx.execute(sql`DELETE FROM audit_logs WHERE created_at < now() - interval '400 days'`);
      });
    });
  }
}
