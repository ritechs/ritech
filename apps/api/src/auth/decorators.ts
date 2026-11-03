import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { MemberType } from "@ritechs/shared";
import type { SessionData, SessionUser } from "./auth.service.js";

export const IS_PUBLIC = "ritechs:public";
export const ROLES = "ritechs:roles";
export const MEMBER = "ritechs:member";
export const NO_IMPERSONATION = "ritechs:no-impersonation";

/** No sign-in needed. Everything else requires a session (secure by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Staff only (admin or editor). With REQUIRE_STAFF_2FA=true, admins must have two-step verification on; otherwise it is optional for everyone. */
export const Staff = () => SetMetadata(ROLES, ["admin", "editor"]);
/** Administrators only. */
export const AdminOnly = () => SetMetadata(ROLES, ["admin"]);
/** Approved members only, optionally of one type. */
export const ApprovedMember = (type?: MemberType) => SetMetadata(MEMBER, { type });
/** Refuse while an admin is impersonating someone (security settings, passwords, roles). */
export const NoImpersonation = () => SetMetadata(NO_IMPERSONATION, true);

export interface AuthedRequest {
  auth?: SessionData;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  return req.auth!.user as SessionUser;
});

export const CurrentSession = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionData => ctx.switchToHttp().getRequest<AuthedRequest>().auth!);
