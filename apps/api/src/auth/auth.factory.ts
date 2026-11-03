/**
 * Better Auth: the only authentication system. NestJS guards handle
 * authorisation on top of the session it issues.
 *
 * Security choices:
 * - email + password, verified email required before any session exists
 * - progressive lockouts per account and per address (AuthThrottleService),
 *   repeat offenders blocked site-wide (IpRulesService)
 * - breached-password check (HaveIBeenPwned k-anonymity; the password never leaves the server)
 * - TOTP two-factor; required for staff by the guards
 * - all sessions revoked on password reset; staff sessions last 12 hours
 * - old ritechs.org bcrypt hashes accepted once, then upgraded to scrypt
 * - no sign-up through Better Auth directly: /api/members/register creates
 *   the account and the member profile together
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { verifyPassword } from "better-auth/crypto";
import { admin, captcha, haveIBeenPwned, twoFactor } from "better-auth/plugins";
import { schema, type Database } from "@ritechs/db";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import type { Env } from "../config/env.js";
import { currentContext } from "../common/request-context.js";
import type { MailService } from "../mail/mail.service.js";
import type { AuditService } from "../security/audit.service.js";
import { accountKey, addressKey, AuthThrottleService, IP_LOCKS_BEFORE_BAN, POLICIES } from "../security/auth-throttle.service.js";
import type { IpRulesService } from "../security/ip-rules.service.js";
import type { RateLimitService } from "../security/rate-limit.service.js";
import { CLIENT_IP_HEADER } from "../security/security.middleware.js";

export const STAFF_ROLES = ["admin", "editor"] as const;
const STAFF_SESSION_SEC = 12 * 3600;

/** Endpoints guarded by the lockout check. */
const THROTTLED = new Set(["/sign-in/email", "/two-factor/verify-totp", "/two-factor/verify-backup-code", "/two-factor/verify-otp", "/request-password-reset", "/change-password"]);
const TWO_FACTOR_VERIFY = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code", "/two-factor/verify-otp"]);

export interface AuthDeps {
  env: Env;
  db: Database;
  throttle: AuthThrottleService;
  ipRules: IpRulesService;
  limiter: RateLimitService;
  audit: AuditService;
  mail: MailService;
}

const isLegacyHash = (h: string) => /^\$2[aby]\$\d\d\$/.test(h);

function lockMessage(until: Date) {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`;
}

export function createAuth(d: AuthDeps) {
  const { env, db } = d;
  const web = new URL(env.WEB_URL).origin;
  const clientIp = () => currentContext()?.ip ?? "0.0.0.0";

  async function onPasswordFailure(email: string) {
    const ip = clientIp();
    const [acct, addr] = await Promise.all([d.throttle.recordFailure(accountKey(email), POLICIES.account), d.throttle.recordFailure(addressKey(ip), POLICIES.ip)]);
    if (acct.locked) {
      const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`).limit(1);
      await d.audit.record({ action: "auth.account_locked", actorId: null, entityType: "user", entityId: u?.id ?? "unknown", metadata: { lockCount: acct.lockCount, until: acct.lockedUntil } });
      // Tell the real owner (only if the account exists), once per lock.
      if (u && acct.lockedUntil)
        await d.mail.queue(email, "account-locked", { until: acct.lockedUntil.toUTCString(), url: `${web}/forgot-password` }, { dedupeKey: `locked:${u.id}:${acct.lockCount}` });
    }
    if (addr.locked) {
      await d.audit.record({ action: "auth.ip_locked", actorId: null, entityType: "ip", entityId: addressKey(ip).slice(3), metadata: { lockCount: addr.lockCount } });
      if (addr.lockCount >= IP_LOCKS_BEFORE_BAN) await d.ipRules.autoBlock(ip, `Repeated failed sign-ins (${addr.lockCount} lockouts in 24h)`);
    }
  }

  const plugins = [
    admin({
      // "editor" is a RiTECHS role: Better Auth treats editors as ordinary users, and the
      // NestJS guards decide what they may do.
      defaultRole: "user",
      adminRoles: ["admin"],
      allowImpersonatingAdmins: false,
      impersonationSessionDuration: 30 * 60,
      bannedUserMessage: "This account has been suspended. Contact info@ritechs.org.",
    }),
    twoFactor({ issuer: "RiTECHS", skipVerificationOnEnable: false, trustDeviceMaxAge: 7 * 24 * 3600 }),
    ...(env.PASSWORD_BREACH_CHECK
      ? [haveIBeenPwned({ customPasswordCompromisedMessage: "This password has appeared in a known data breach. Please choose a different one." })]
      : []),
    ...(env.TURNSTILE_SECRET_KEY
      ? [captcha({ provider: "cloudflare-turnstile", secretKey: env.TURNSTILE_SECRET_KEY, endpoints: ["/sign-in/email", "/request-password-reset", "/sign-up/email"] })]
      : []),
  ];

  return betterAuth({
    appName: "RiTECHS",
    baseURL: web,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [web, ...env.TRUSTED_ORIGINS.map((o) => new URL(o).origin)],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, twoFactor: schema.twoFactor },
    }),
    // Registration goes through /api/members/register (account + profile together).
    disabledPaths: ["/sign-up/email"],
    // Rate limiting is handled for every route by SecurityMiddleware (Postgres-backed, shared across instances).
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 30 * 60,
      password: {
        verify: async ({ hash, password }) =>
          isLegacyHash(hash) ? bcrypt.compare(password, hash.replace(/^\$2y\$/, "$2b$")) : verifyPassword({ hash, password }),
      },
      sendResetPassword: async ({ user, token }) => {
        await d.mail.queue(user.email, "reset-password", { name: user.name, url: `${web}/reset-password?token=${encodeURIComponent(token)}` });
      },
      onPasswordReset: async ({ user }) => {
        await d.throttle.unlock(accountKey(user.email));
        await d.audit.record({ action: "auth.password_reset", actorId: user.id, entityType: "user", entityId: user.id });
        await d.mail.queue(user.email, "password-changed");
      },
      onExistingUserSignUp: async ({ user }) => {
        await d.mail.queue(user.email, "existing-account", { url: `${web}/forgot-password` }, { dedupeKey: `existing:${user.id}:${new Date().toISOString().slice(0, 13)}` });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 24 * 3600,
      sendVerificationEmail: async ({ user, token }) => {
        const url = `${web}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent("/login?verified=1")}`;
        await d.mail.queue(user.email, "verify-email", { name: user.name, url }, { dedupeKey: `verify:${user.id}:${new Date().toISOString().slice(0, 15)}` });
      },
    },
    session: {
      expiresIn: 7 * 24 * 3600,
      updateAge: 24 * 3600,
      freshAge: 10 * 60,
      // No cookie cache: revoked or banned sessions stop working on the very next request.
      cookieCache: { enabled: false },
    },
    advanced: {
      cookiePrefix: "ritechs",
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [u] = await db.select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, session.userId)).limit(1);
            if (u && (STAFF_ROLES as readonly string[]).includes(u.role)) {
              const cap = new Date(Date.now() + STAFF_SESSION_SEC * 1000);
              if (session.expiresAt > cap) return { data: { ...session, expiresAt: cap } };
            }
            return;
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!THROTTLED.has(ctx.path)) return;
        const ip = clientIp();
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : null;
        const keys = [addressKey(ip), ...(email ? [accountKey(email)] : [])];
        const until = await d.throttle.lockedUntil(keys);
        if (until)
          throw new APIError("TOO_MANY_REQUESTS", { code: "TOO_MANY_ATTEMPTS", message: lockMessage(until) }, { "Retry-After": String(Math.ceil((until.getTime() - Date.now()) / 1000)) });
        if (ctx.path === "/request-password-reset" && email) {
          // At most 3 reset emails per address per hour, whoever asks.
          const r = await d.limiter.consume(`reset-email:${accountKey(email)}`, 3, 3600);
          if (!r.allowed) throw new APIError("TOO_MANY_REQUESTS", { code: "TOO_MANY_ATTEMPTS", message: "Too many reset requests for this email. Try again later." });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        const failed = returned instanceof APIError;
        if (ctx.path === "/sign-in/email") {
          const email = String(ctx.body?.email ?? "").trim().toLowerCase();
          if (!email) return;
          if (failed) {
            // Only a wrong password counts; "email not verified" means the password was right.
            if ((returned as APIError).body?.code === "INVALID_EMAIL_OR_PASSWORD") await onPasswordFailure(email);
            return;
          }
          await d.throttle.recordSuccess(accountKey(email));
          const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`).limit(1);
          if (!u) return;
          await db.update(schema.user).set({ lastLoginAt: new Date() }).where(eq(schema.user.id, u.id));
          await d.audit.record({ action: "auth.sign_in", actorId: u.id, entityType: "user", entityId: u.id });
          // Upgrade an old ritechs.org bcrypt hash now that we have the plain password.
          const [acc] = await db
            .select({ id: schema.account.id, password: schema.account.password })
            .from(schema.account)
            .where(and(eq(schema.account.userId, u.id), eq(schema.account.providerId, "credential")))
            .limit(1);
          if (acc?.password && isLegacyHash(acc.password) && typeof ctx.body?.password === "string") {
            const upgraded = await ctx.context.password.hash(ctx.body.password);
            await db.update(schema.account).set({ password: upgraded, updatedAt: new Date() }).where(eq(schema.account.id, acc.id));
          }
          return;
        }
        if (TWO_FACTOR_VERIFY.has(ctx.path) && failed) {
          const r = await d.throttle.recordFailure(addressKey(clientIp()), POLICIES.ip);
          await d.audit.record({ action: "auth.2fa_failed", actorId: null });
          if (r.locked && r.lockCount >= IP_LOCKS_BEFORE_BAN) await d.ipRules.autoBlock(clientIp(), "Repeated failed two-factor codes");
          return;
        }
        if (ctx.path === "/change-password" && failed && (returned as APIError).body?.code === "INVALID_PASSWORD") {
          const s = ctx.context.session;
          if (s) await onPasswordFailure(s.user.email.toLowerCase());
        }
        const actorId = ctx.context.session?.user.id ?? null;
        if (ctx.path === "/two-factor/verify-totp" && !failed && actorId) await d.audit.record({ action: "auth.2fa_verified", actorId, entityType: "user", entityId: actorId });
        if (ctx.path === "/two-factor/enable" && !failed) await d.audit.record({ action: "auth.2fa_enabled", actorId, entityType: "user", entityId: actorId ?? undefined });
        if (ctx.path === "/two-factor/disable" && !failed) await d.audit.record({ action: "auth.2fa_disabled", actorId, entityType: "user", entityId: actorId ?? undefined });
      }),
    },
    plugins,
  });
}

export type Auth = ReturnType<typeof createAuth>;
