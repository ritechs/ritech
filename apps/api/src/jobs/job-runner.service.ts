import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";
import { JobsService } from "./jobs.service.js";

export const RUN_WORKER = Symbol("RUN_WORKER");

/**
 * Polls the job table. Runs in the API process (WORKER_IN_PROCESS) or in a separate worker process.
 * With DB_SCALE_TO_ZERO it sleeps until the next job is due (at most IDLE_MAX_MS) and is woken
 * at once when this process queues a job, so a pausing database (Neon) can actually pause.
 */
const IDLE_MAX_MS = 30 * 60_000;
@Injectable()
export class JobRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger("JobRunner");
  private stopped = false;
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private ticking = false;
  private wakeRequested = false;
  private unsubscribe?: () => void;

  constructor(
    private readonly jobs: JobsService,
    @Inject(ENV) private readonly env: Env,
    @Inject(RUN_WORKER) private readonly enabled: boolean,
  ) {}

  onApplicationBootstrap() {
    if (!this.enabled || this.env.NODE_ENV === "test") return;
    this.log.log(this.env.DB_SCALE_TO_ZERO ? "job worker started (idle-friendly polling)" : "job worker started");
    if (this.env.DB_SCALE_TO_ZERO) this.unsubscribe = this.jobs.onEnqueue(() => this.wake());
    this.schedule(500);
  }

  private schedule(ms: number) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.running = this.tick();
    }, ms);
  }

  /** A job was just queued: run it now (or right after the current poll). */
  private wake() {
    if (this.ticking) this.wakeRequested = true;
    else this.schedule(0);
  }

  private async tick() {
    this.ticking = true;
    this.wakeRequested = false;
    let ran = 0;
    let next = 1000;
    try {
      ran = await this.jobs.runOnce(10);
      if (ran < 10 && this.env.DB_SCALE_TO_ZERO) {
        const due = await this.jobs.nextDueAt();
        next = due ? Math.min(Math.max(due.getTime() - Date.now(), 1000), IDLE_MAX_MS) : IDLE_MAX_MS;
      }
    } catch (err) {
      this.log.error({ err }, "job poll failed");
      if (this.env.DB_SCALE_TO_ZERO) next = 60_000;
    } finally {
      this.ticking = false;
    }
    this.schedule(ran === 10 || this.wakeRequested ? 0 : next);
  }

  async onApplicationShutdown() {
    this.stopped = true;
    this.unsubscribe?.();
    clearTimeout(this.timer);
    await this.running;
  }
}
