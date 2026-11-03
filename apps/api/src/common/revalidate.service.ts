import { Global, Inject, Injectable, Logger, Module, type OnApplicationBootstrap } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";
import { JobsService } from "../jobs/jobs.service.js";

/**
 * Tells the Next.js site to refresh cached pages after content changes
 * (on-demand ISR). Queued, so an unreachable website never fails an edit.
 */
@Injectable()
export class RevalidateService implements OnApplicationBootstrap {
  private readonly log = new Logger("Revalidate");

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobsService,
  ) {
    jobs.register("web.revalidate", async (payload) => {
      if (!env.WEB_REVALIDATE_URL || !env.REVALIDATE_SECRET) return;
      const res = await fetch(env.WEB_REVALIDATE_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.REVALIDATE_SECRET}` },
        body: JSON.stringify({ tags: payload.tags }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`revalidate returned ${res.status}`);
    });
  }

  /** After a deploy, pages pre-rendered from bundled content are refreshed from the database. */
  async onApplicationBootstrap() {
    if (this.env.NODE_ENV === "test") return;
    await this.jobs
      .enqueue("web.revalidate", { tags: ["conferences", "news", "mentors", "partners", "publications", "events"] }, { dedupeKey: "revalidate:boot", runAt: new Date(Date.now() + 15_000), maxAttempts: 10 })
      .catch(() => undefined);
  }

  async tags(...tags: string[]) {
    if (!this.env.WEB_REVALIDATE_URL) return;
    await this.jobs.enqueue("web.revalidate", { tags }, { maxAttempts: 3 }).catch((err) => this.log.warn({ err }, "could not queue revalidation"));
  }
}

@Global()
@Module({ providers: [RevalidateService], exports: [RevalidateService] })
export class RevalidateModule {}
