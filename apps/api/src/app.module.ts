import { Module, type DynamicModule } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module.js";
import { ConfigModule } from "./config/config.module.js";
import type { Env } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { MailModule } from "./mail/mail.module.js";
import { DOMAIN_MODULES } from "./modules/index.js";
import { HealthModule } from "./modules/health/health.module.js";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module.js";
import { SecurityModule } from "./security/security.module.js";
import { StorageModule } from "./storage/storage.module.js";

export interface AppOptions {
  /** Run background jobs in this process. */
  worker: boolean;
  /** Run scheduled housekeeping (advisory-locked, safe on every instance). */
  cron: boolean;
}

@Module({})
export class AppModule {
  static forRoot(env: Env, opts: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        DatabaseModule,
        ...(opts.cron ? [ScheduleModule.forRoot(), MaintenanceModule] : []),
        SecurityModule,
        JobsModule.forRoot(opts.worker),
        MailModule,
        StorageModule,
        AuthModule,
        HealthModule,
        ...DOMAIN_MODULES,
      ],
    };
  }
}
