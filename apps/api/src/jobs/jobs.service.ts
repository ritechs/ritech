/**
 * A small, durable job queue on Postgres (no Redis). Jobs are claimed with
 * `FOR UPDATE SKIP LOCKED`, retried with exponential backoff, and recovered
 * if a worker dies mid-job. Throughput needs here (emails, campaign batches,
 * cache revalidation) are far below what this design handles.
 */
import { Injectable, Logger } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { hostname } from "node:os";
import { InjectDb } from "../database/database.module.js";

export type JobHandler = (payload: Record<string, unknown>, job: { id: number; attempts: number }) => Promise<void>;

type ClaimedJob = {
  id: number;
  queue: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

@Injectable()
export class JobsService {
  private readonly log = new Logger("Jobs");
  private readonly handlers = new Map<string, JobHandler>();
  private readonly workerId = `${hostname()}:${process.pid}`;
  private readonly listeners = new Set<() => void>();

  constructor(@InjectDb() private readonly db: Database) {}

  async enqueue(queue: string, payload: Record<string, unknown>, opts: { runAt?: Date; dedupeKey?: string; maxAttempts?: number } = {}) {
    const rows = await this.db
      .insert(schema.jobs)
      .values({ queue, payload, runAt: opts.runAt ?? new Date(), dedupeKey: opts.dedupeKey ?? null, maxAttempts: opts.maxAttempts ?? 5 })
      .onConflictDoNothing()
      .returning({ id: schema.jobs.id });
    const id = rows[0]?.id ?? null;
    // Wake an in-process worker so the job runs now rather than at its next poll.
    if (id !== null && (!opts.runAt || opts.runAt.getTime() <= Date.now() + 1000)) for (const fn of this.listeners) fn();
    return id;
  }

  /** Called when a job is queued by this process. Returns a function that removes the listener. */
  onEnqueue(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** When the next queued job is due (null if none), so an idle worker can sleep until then. */
  async nextDueAt(): Promise<Date | null> {
    if (!this.handlers.size) return null;
    const queues = [...this.handlers.keys()];
    const r = await this.db.execute<{ at: Date | string | null }>(sql`
      SELECT min(run_at) AS at FROM jobs
      WHERE status = 'queued' AND queue IN (${sql.join(queues.map((q) => sql`${q}`), sql`, `)})`);
    const at = r.rows[0]?.at;
    return at ? new Date(at) : null;
  }

  register(queue: string, handler: JobHandler) {
    this.handlers.set(queue, handler);
  }

  /** Claims and runs up to `limit` due jobs. Returns how many ran. */
  async runOnce(limit = 10): Promise<number> {
    if (!this.handlers.size) return 0;
    const queues = [...this.handlers.keys()];
    const claimed = await this.db.execute<ClaimedJob>(sql`
      UPDATE jobs SET status = 'running', locked_at = now(), locked_by = ${this.workerId}, attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM jobs
        WHERE status = 'queued' AND run_at <= now() AND queue IN (${sql.join(queues.map((q) => sql`${q}`), sql`, `)})
        ORDER BY run_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, queue, payload, attempts, max_attempts`);

    await Promise.all(
      claimed.rows.map(async (job) => {
        const handler = this.handlers.get(job.queue)!;
        try {
          await handler(job.payload, { id: job.id, attempts: job.attempts });
          await this.db.execute(sql`UPDATE jobs SET status = 'done', finished_at = now(), locked_at = NULL, last_error = NULL WHERE id = ${job.id}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const final = job.attempts >= job.max_attempts;
          // 30s, 2m, 8m, 32m… capped at 2h
          const delay = Math.min(30 * 4 ** (job.attempts - 1), 7200);
          await this.db.execute(sql`
            UPDATE jobs SET
              status = ${final ? "failed" : "queued"}::job_status,
              run_at = now() + ${delay} * interval '1 second',
              locked_at = NULL, last_error = ${message.slice(0, 2000)},
              finished_at = ${final ? sql`now()` : sql`NULL`}
            WHERE id = ${job.id}`);
          this.log[final ? "error" : "warn"]({ jobId: job.id, queue: job.queue, attempt: job.attempts, err: message }, final ? "job failed permanently" : "job failed, will retry");
        }
      }),
    );
    return claimed.rows.length;
  }

  /** Puts jobs from crashed workers back in the queue, and prunes old finished jobs. */
  async maintenance() {
    await this.db.execute(sql`UPDATE jobs SET status = 'queued', locked_at = NULL WHERE status = 'running' AND locked_at < now() - interval '10 minutes'`);
    await this.db.execute(sql`DELETE FROM jobs WHERE status = 'done' AND finished_at < now() - interval '14 days'`);
    await this.db.execute(sql`DELETE FROM jobs WHERE status = 'failed' AND finished_at < now() - interval '90 days'`);
  }
}
