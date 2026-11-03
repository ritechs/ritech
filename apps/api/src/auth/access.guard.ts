import { type CanActivate, type ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { schema, type Database } from "@ritechs/db";
import type { MemberType } from "@ritechs/shared";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { ENV, type Env } from "../config/env.js";
import { AppError, forbidden } from "../common/errors.js";
import { currentContext } from "../common/request-context.js";
import { InjectDb } from "../database/database.module.js";
import { AuthService, type SessionUser } from "./auth.service.js";
import { IS_PUBLIC, MEMBER, NO_IMPERSONATION, ROLES, type AuthedRequest } from "./decorators.js";

/**
 * Global guard: every route needs a valid session unless marked @Public().
 * Then role (@Staff/@AdminOnly) and membership (@ApprovedMember) checks.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    @Inject(ENV) private readonly env: Env,
    @InjectDb() private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & AuthedRequest>();
    const session = await this.authService.getSession(req.headers);
    if (!session) throw new AppError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in to continue.");
    req.auth = session;
    const store = currentContext();
    if (store) store.userId = session.user.id;

    const user = session.user as SessionUser;
    const impersonating = !!(session.session as { impersonatedBy?: string | null }).impersonatedBy;
    if (impersonating && this.reflector.getAllAndOverride<boolean>(NO_IMPERSONATION, targets))
      throw forbidden("This action is not available while impersonating a user.", "IMPERSONATION_FORBIDDEN");

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES, targets);
    if (roles) {
      if (!user.role || !roles.includes(user.role)) throw forbidden();
      // Optional by default. With REQUIRE_STAFF_2FA=true, admins (who manage staff, security and campaigns) must have it on.
      if (this.env.REQUIRE_STAFF_2FA && user.role === "admin" && !user.twoFactorEnabled && !impersonating)
        throw forbidden("Turn on two-factor authentication to use the admin area.", "TWO_FACTOR_REQUIRED");
    }

    const member = this.reflector.getAllAndOverride<{ type?: MemberType }>(MEMBER, targets);
    if (member) {
      const [p] = await this.db
        .select({ type: schema.memberProfiles.type, status: schema.memberProfiles.status })
        .from(schema.memberProfiles)
        .where(eq(schema.memberProfiles.userId, user.id))
        .limit(1);
      if (!p || p.status !== "approved") throw forbidden("Your membership has not been approved yet.", "MEMBERSHIP_NOT_APPROVED");
      if (member.type && p.type !== member.type) throw forbidden(`This is only available to ${member.type}s.`, "WRONG_MEMBER_TYPE");
    }
    return true;
  }
}
