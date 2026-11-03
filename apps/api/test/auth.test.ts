import { schema } from "@ritechs/db";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MailService } from "../src/mail/mail.service.js";
import { lastMailTo, linkIn, mentorBody, nextIp, signedInMember, signedInStaff, startApp, totp, uniqueEmail, WEB, type TestApp } from "./helpers.js";

let t: TestApp;
beforeAll(async () => {
  t = await startApp();
});
afterAll(async () => {
  await t.close();
});
const client = () => t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());

describe("registration", () => {
  it("creates a pending member and sends a verification email", async () => {
    const email = uniqueEmail("reg");
    const res = await client().post("/api/members/register").send(mentorBody(email)).expect(202);
    expect(res.body.status).toBe("verification_sent");
    await t.drain();
    expect(lastMailTo(email)?.subject).toMatch(/registration received|confirm your email/i);
    const [p] = await t.db.select().from(schema.memberProfiles).innerJoin(schema.user, eq(schema.user.id, schema.memberProfiles.userId)).where(eq(schema.user.email, email));
    expect(p!.member_profiles.status).toBe("pending");
    expect(p!.member_profiles.phoneE164).toBe("+447911123456");
  });

  it("answers identically for an email that is already registered", async () => {
    const email = uniqueEmail("dup");
    const first = await client().post("/api/members/register").send(mentorBody(email)).expect(202);
    const second = await client().post("/api/members/register").send({ ...mentorBody(email), firstName: "Mallory" }).expect(202);
    expect(second.body).toEqual(first.body);
    const users = await t.db.select().from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`);
    expect(users).toHaveLength(1);
    await t.drain();
    expect(MailService.outbox.some((m) => m.to === email && /tried to register/i.test(m.subject))).toBe(true);
    const [profile] = await t.db.select({ first: schema.memberProfiles.firstName }).from(schema.memberProfiles).where(eq(schema.memberProfiles.userId, users[0]!.id));
    expect(profile!.first).toBe("Ada");
  });

  it("validates input with field-level messages", async () => {
    const res = await client().post("/api/members/register").send({ ...mentorBody(uniqueEmail("bad")), bio: "short", password: "short", privacy: false }).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["bio", "password", "privacy"]));
  });

  it("blocks direct Better Auth sign-up (profile would be missing)", async () => {
    await client().post("/api/auth/sign-up/email").send({ email: uniqueEmail("direct"), password: "Correct-Horse-42", name: "x" }).expect(404);
  });

  it("does not allow sign-in before the email is verified", async () => {
    const email = uniqueEmail("unverified");
    await client().post("/api/members/register").send(mentorBody(email)).expect(202);
    const res = await client().post("/api/auth/sign-in/email").send({ email, password: "Correct-Horse-42" });
    expect(res.status).toBe(403);
  });
});

describe("sessions", () => {
  it("signs in after verification, with an httpOnly SameSite cookie", async () => {
    const m = await signedInMember(t);
    const me = await m.agent.get("/api/me").expect(200);
    expect(me.body.user.email).toBe(m.email);
    expect(me.body.profile.status).toBe("pending");
    expect(me.body.profile).not.toHaveProperty("search");
  });

  it("issues cookies with secure attributes", async () => {
    const email = uniqueEmail("cookie");
    await client().post("/api/members/register").send(mentorBody(email)).expect(202);
    await t.drain();
    const verify = linkIn(lastMailTo(email, /confirm your email/i)!.text, /http:\/\/localhost:3000\/api\/auth\/verify-email\?\S+/)!;
    await client().get(verify.replace(WEB, ""));
    const res = await client().post("/api/auth/sign-in/email").send({ email, password: "Correct-Horse-42" }).expect(200);
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/ritechs\.session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("password reset signs out every device and notifies the owner", async () => {
    const m = await signedInMember(t);
    await m.agent.get("/api/me").expect(200);
    await client().post("/api/auth/request-password-reset").send({ email: m.email, redirectTo: `${WEB}/reset-password` }).expect(200);
    await t.drain();
    const token = linkIn(lastMailTo(m.email, /reset your password/i)!.text, /token=[^\s&]+/)!.slice(6);
    await client().post("/api/auth/reset-password").send({ token: decodeURIComponent(token), newPassword: "Brand-New-Pass-77" }).expect(200);
    await m.agent.get("/api/me").expect(401);
    await t.drain();
    expect(MailService.outbox.some((x) => x.to === m.email && /password was changed/i.test(x.subject))).toBe(true);
    await client().post("/api/auth/sign-in/email").send({ email: m.email, password: "Brand-New-Pass-77" }).expect(200);
  });

  it("accepts an old ritechs.org bcrypt hash once, then upgrades it", async () => {
    const email = uniqueEmail("legacy");
    const id = crypto.randomUUID();
    const legacy = (await bcrypt.hash("Old-Site-Pass-1", 10)).replace(/^\$2[ab]\$/, "$2y$");
    await t.db.insert(schema.user).values({ id, name: "Legacy User", email, emailVerified: true });
    await t.db.insert(schema.account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: legacy, updatedAt: new Date() });
    await client().post("/api/auth/sign-in/email").send({ email, password: "Old-Site-Pass-1" }).expect(200);
    const [acc] = await t.db.select({ password: schema.account.password }).from(schema.account).where(eq(schema.account.userId, id));
    expect(acc!.password).not.toMatch(/^\$2/);
    await client().post("/api/auth/sign-in/email").send({ email, password: "Old-Site-Pass-1" }).expect(200);
  });
});

describe("staff two-factor", () => {
  it("is optional for admins by default", async () => {
    const a = await signedInStaff(t, "admin");
    await a.agent.get("/api/admin/dashboard").expect(200);
    const me = await a.agent.get("/api/me").expect(200);
    expect(me.body.user.twoFactorRequired).toBe(false);
  });

  it("is optional for editors", async () => {
    const strict = await startApp({ REQUIRE_STAFF_2FA: "true" });
    try {
      const e = await signedInStaff(strict, "editor");
      await e.agent.get("/api/admin/dashboard").expect(200);
    } finally {
      await strict.close();
    }
  });

  it("blocks the admin area until 2FA is on, then works with a real TOTP code", async () => {
    const strict = await startApp({ REQUIRE_STAFF_2FA: "true" });
    try {
      const a = await signedInStaff(strict, "admin");
      const denied = await a.agent.get("/api/admin/dashboard").expect(403);
      expect(denied.body.error.code).toBe("TWO_FACTOR_REQUIRED");
      expect((await a.agent.get("/api/me").expect(200)).body.user.twoFactorRequired).toBe(true);

      const enable = await a.agent.post("/api/auth/two-factor/enable").send({ password: "Staff-Password-99" }).expect(200);
      const secret = new URL(enable.body.totpURI).searchParams.get("secret")!;
      await a.agent.post("/api/auth/two-factor/verify-totp").send({ code: totp(secret) }).expect(200);

      // A new sign-in now needs the second factor.
      const fresh = strict.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());
      const step1 = await fresh.post("/api/auth/sign-in/email").send({ email: a.email, password: "Staff-Password-99" }).expect(200);
      expect(step1.body.twoFactorRedirect).toBe(true);
      await fresh.get("/api/admin/dashboard").expect(401);
      await fresh.post("/api/auth/two-factor/verify-totp").send({ code: "000000" }).expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
      await fresh.post("/api/auth/two-factor/verify-totp").send({ code: totp(secret) }).expect(200);
      await fresh.get("/api/admin/dashboard").expect(200);

      const [s] = await strict.db.select({ expiresAt: schema.session.expiresAt }).from(schema.session).where(eq(schema.session.userId, a.userId)).orderBy(sql`created_at desc`).limit(1);
      expect(s!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(12 * 3600_000 + 5000);
    } finally {
      await strict.close();
    }
  });
});
