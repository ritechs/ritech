import { Controller, Get, Header, HttpStatus } from "@nestjs/common";
import type { Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { Public } from "../../auth/decorators.js";
import { AppError } from "../../common/errors.js";
import { InjectDb } from "../../database/database.module.js";

@Controller("health")
@Public()
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Liveness: the process is up. */
  @Get()
  @Header("Cache-Control", "no-store")
  live() {
    return { status: "ok" };
  }

  /** Readiness: the database answers. Load balancers should route only to ready instances. */
  @Get("ready")
  @Header("Cache-Control", "no-store")
  async ready() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { status: "ok" };
    } catch {
      throw new AppError(HttpStatus.SERVICE_UNAVAILABLE, "NOT_READY", "Database unavailable.");
    }
  }
}
