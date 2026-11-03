import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb, createPool, type Database } from "@ritechs/db";
import type pg from "pg";
import { ENV, type Env } from "../config/env.js";

export const DB = Symbol("DB");
export const PG_POOL = Symbol("PG_POOL");
/** Inject the Drizzle database. */
export const InjectDb = () => Inject(DB);

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) =>
        createPool({ url: env.DATABASE_URL, max: env.DATABASE_POOL_MAX, ssl: env.DATABASE_SSL, applicationName: "ritechs-api" }),
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool): Database => createDb(pool) },
  ],
  exports: [DB, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
