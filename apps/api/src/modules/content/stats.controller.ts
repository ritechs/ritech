import { Controller, Get, Header } from "@nestjs/common";
import type { Database } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { Public } from "../../auth/decorators.js";
import { PUBLIC_CACHE } from "../../common/http.js";
import { InjectDb } from "../../database/database.module.js";

/** Live figures for the homepage, counted from the database. */
@Controller("stats")
@Public()
export class StatsController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get()
  @Header("Cache-Control", PUBLIC_CACHE)
  async stats() {
    const r = await this.db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT count(*)::int FROM conferences WHERE status = 'published') AS conferences,
        (SELECT count(*)::int FROM member_profiles WHERE type = 'mentor' AND status = 'approved' AND show_in_directory) AS mentors,
        (SELECT count(*)::int FROM member_profiles WHERE status = 'approved') AS members,
        (SELECT count(*)::int FROM organisations WHERE is_partner AND active) AS partners,
        (SELECT count(DISTINCT country)::int FROM member_profiles WHERE status = 'approved' AND country IS NOT NULL) AS countries,
        (SELECT count(*)::int FROM events WHERE status = 'published') AS events,
        (SELECT count(*)::int FROM publications WHERE status = 'published') AS publications`);
    return r.rows[0];
  }
}
