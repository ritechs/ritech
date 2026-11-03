import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;
export { schema };

export interface DbOptions {
  url: string;
  /** Max connections per process. Keep (instances × max) under Postgres max_connections / the pooler limit. */
  max?: number;
  ssl?: boolean;
  applicationName?: string;
  /** Kill queries that run longer than this (ms). Protects the pool from slow-query pile-ups. */
  statementTimeoutMs?: number;
}

export function createPool(o: DbOptions) {
  return new pg.Pool({
    connectionString: o.url,
    max: o.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: o.statementTimeoutMs ?? 10_000,
    application_name: o.applicationName ?? "ritechs",
    ssl: o.ssl ? { rejectUnauthorized: true } : undefined,
  });
}

export function createDb(pool: pg.Pool): Database {
  return drizzle(pool, { schema });
}
