/**
 * Applies pending SQL migrations from ./migrations. Run as a separate
 * deployment step (before the new API version starts), never at app boot.
 *
 *   DATABASE_URL=postgres://… node dist/migrate.js
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb, createPool } from "./client.js";
import { loadRootEnv, requireDatabaseUrl } from "./env.js";

loadRootEnv();
const url = requireDatabaseUrl("MIGRATION_DATABASE_URL");
const here = path.dirname(fileURLToPath(import.meta.url));
const pool = createPool({ url, max: 1, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-migrate", statementTimeoutMs: 0 });
try {
  // A session-level advisory lock stops two deploys migrating at once.
  await pool.query("SELECT pg_advisory_lock(727274)");
  await migrate(createDb(pool), { migrationsFolder: path.resolve(here, "../migrations") });
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.query("SELECT pg_advisory_unlock(727274)").catch(() => {});
  await pool.end();
}
