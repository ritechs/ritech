/** Recreates the test database schema from the migrations before the run. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://ritechs:ritechs@127.0.0.1:5432/ritechs_test";

export default async function setup() {
  const pool = new pg.Pool({ connectionString: TEST_DB, max: 1 });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  const here = path.dirname(fileURLToPath(import.meta.url));
  await migrate(drizzle(pool), { migrationsFolder: path.resolve(here, "../../../packages/db/migrations") });
  await pool.end();
}
