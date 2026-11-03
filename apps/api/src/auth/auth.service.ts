import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "@ritechs/db";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { ENV, type Env } from "../config/env.js";
import { InjectDb } from "../database/database.module.js";
import { MailService } from "../mail/mail.service.js";
import { AuditService } from "../security/audit.service.js";
import { AuthThrottleService } from "../security/auth-throttle.service.js";
import { IpRulesService } from "../security/ip-rules.service.js";
import { RateLimitService } from "../security/rate-limit.service.js";
import { createAuth, type Auth } from "./auth.factory.js";

export type SessionData = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
export type SessionUser = SessionData["user"] & { role?: string | null; twoFactorEnabled?: boolean | null; banned?: boolean | null };

@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(
    @Inject(ENV) env: Env,
    @InjectDb() db: Database,
    throttle: AuthThrottleService,
    ipRules: IpRulesService,
    limiter: RateLimitService,
    audit: AuditService,
    mail: MailService,
  ) {
    this.auth = createAuth({ env, db, throttle, ipRules, limiter, audit, mail });
  }

  /** Reads the session from request cookies. Does not extend it (the web app's own calls do that). */
  async getSession(headers: IncomingHttpHeaders): Promise<SessionData | null> {
    return this.auth.api.getSession({ headers: fromNodeHeaders(headers), query: { disableRefresh: true } });
  }
}
