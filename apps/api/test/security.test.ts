import { schema } from "@ritechs/db";
import { sql } from "drizzle-orm";
import type { IncomingMessage } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountKey, AuthThrottleService, POLICIES } from "../src/security/auth-throttle.service.js";
import { ClientIpResolver } from "../src/security/client-ip.js";
import { IpRulesService } from "../src/security/ip-rules.service.js";
import { nextIp, signedInMember, signedInStaff, startApp, uniqueEmail, WEB, type TestApp } from "./helpers.js";

let t: TestApp;
beforeAll(async () => {
  t = await startApp();
});
afterAll(async () => {
  await t.close();
});

describe("client IP resolution", () => {
  const req = (peer: string, headers: Record<string, string> = {}) => ({ socket: { remoteAddress: peer }, headers }) as unknown as IncomingMessage;
  const r = new ClientIpResolver(["10.0.0.0/8"]);

  it("ignores X-Forwarded-For from untrusted peers (no spoofing)", () => {
    expect(r.resolve(req("203.0.113.9", { "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
  });
  it("walks the chain right-to-left past trusted proxies", () => {
    expect(r.resolve(req("10.0.0.2", { "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.5" }))).toBe("203.0.113.9");
  });
  it("normalises IPv4-mapped IPv6", () => {
    expect(r.resolve(req("::ffff:203.0.113.9"))).toBe("203.0.113.9");
  });
});

describe("headers and CSRF", () => {
  it("sends strict security headers and a request id", async () => {
    const res = await t.http().get("/api/health").expect(200);
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects state-changing requests without our Origin", async () => {
    const ip = nextIp();
    await t.http().set("X-Forwarded-For", ip).post("/api/newsletter").send({ email: "a@example.org" }).expect(403);
    await t.http().set("X-Forwarded-For", ip).set("Origin", "https://evil.example").post("/api/newsletter").send({ email: "a@example.org" }).expect(403);
    await t.http().set("X-Forwarded-For", ip).set("Origin", WEB).post("/api/newsletter").send({ email: "a@example.org" }).expect(202);
  });

  it("rejects form-encoded bodies (classic CSRF vector)", async () => {
    const res = await t.http().set("X-Forwarded-For", nextIp()).set("Origin", WEB).post("/api/contact").type("form").send("name=x&email=a@b.co");
    expect(res.status).toBe(415);
  });

  it("rejects oversized JSON", async () => {
    const res = await t.http().set("X-Forwarded-For", nextIp()).set("Origin", WEB).post("/api/contact").send({ name: "x", email: "a@b.co", subject: "s", message: "m".repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it("does not leak internals on errors", async () => {
    const res = await t.http().get("/api/conferences/%E0%A4%A").expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
    expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules|at /);
  });
});

describe("rate limiting and IP blocking", () => {
  it("limits public forms and auto-blocks addresses that keep hammering", async () => {
    const ip = nextIp();
    const http = () => t.http().set("X-Forwarded-For", ip).set("Origin", WEB);
    for (let i = 0; i < 10; i++) await http().post("/api/contact").send({ name: "Bot", email: "bot@example.org", subject: "Hi", message: "Hello there friends" }).expect(202);
    const limited = await http().post("/api/contact").send({ name: "Bot", email: "bot@example.org", subject: "Hi", message: "Hello there friends" });
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    for (let i = 0; i < 30; i++) await http().post("/api/contact").send({});
    const blocked = await http().get("/api/conferences");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("ACCESS_DENIED");
    // Other addresses are unaffected.
    await t.http().set("X-Forwarded-For", nextIp()).get("/api/conferences").expect(200);
    const [rule] = await t.db.select().from(schema.ipRules).where(sql`${schema.ipRules.cidr} >>= ${ip}::inet`);
    expect(rule?.source).toBe("auto");
    expect(rule?.expiresAt).toBeTruthy();
  });

  it("allow rules win over block rules", async () => {
    const rules = t.app.get(IpRulesService);
    await rules.addRule({ cidr: "192.0.2.0/24", action: "block", reason: "test", expiresAt: null, source: "manual", createdBy: null });
    await t.http().set("X-Forwarded-For", "192.0.2.10").get("/api/conferences").expect(403);
    await rules.addRule({ cidr: "192.0.2.10/32", action: "allow", reason: "university NAT", expiresAt: null, source: "manual", createdBy: null });
    await t.http().set("X-Forwarded-For", "192.0.2.10").get("/api/conferences").expect(200);
    await t.http().set("X-Forwarded-For", "192.0.2.11").get("/api/conferences").expect(403);
  });

  it("the internal token bypasses per-IP limits (Next.js server rendering)", async () => {
    const ip = nextIp();
    for (let i = 0; i < 12; i++)
      await t.http().set("X-Forwarded-For", ip).set("X-Internal-Token", "internal-token-internal-token-internal-token").post("/api/contact").send({ name: "SSR", email: "ssr@example.org", subject: "Hi", message: "Server side call" }).expect(202);
  });
});

describe("brute-force protection", () => {
  it("locks an account after 5 wrong passwords, even for the right password, and emails the owner", async () => {
    const m = await signedInMember(t);
    const attacker = () => t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());
    for (let i = 0; i < 5; i++) await attacker().post("/api/auth/sign-in/email").send({ email: m.email, password: `wrong-password-${i}` }).expect(401);
    const locked = await attacker().post("/api/auth/sign-in/email").send({ email: m.email, password: "Correct-Horse-42" });
    expect(locked.status).toBe(429);
    expect(locked.body.code ?? locked.body.error?.code).toBe("TOO_MANY_ATTEMPTS");
    await t.drain();
    const { MailService } = await import("../src/mail/mail.service.js");
    expect(MailService.outbox.some((x) => x.to === m.email && /locked/i.test(x.subject))).toBe(true);
    const audit = await t.db.select().from(schema.auditLogs).where(sql`${schema.auditLogs.action} = 'auth.account_locked' AND ${schema.auditLogs.entityId} = ${m.userId}`);
    expect(audit.length).toBe(1);
  });

  it("locks unknown emails the same way (no account enumeration)", async () => {
    const ghost = uniqueEmail("ghost");
    for (let i = 0; i < 5; i++) await t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp()).post("/api/auth/sign-in/email").send({ email: ghost, password: "whatever-123" }).expect(401);
    await t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp()).post("/api/auth/sign-in/email").send({ email: ghost, password: "whatever-123" }).expect(429);
  });

  it("lock length doubles on repeat lockouts", async () => {
    const throttle = t.app.get(AuthThrottleService);
    const key = accountKey(uniqueEmail("escalate"));
    const lockLen = async () => {
      let r;
      for (let i = 0; i < POLICIES.account.maxFailures; i++) r = await throttle.recordFailure(key, POLICIES.account);
      return Math.round((r!.lockedUntil!.getTime() - Date.now()) / 60_000);
    };
    expect(await lockLen()).toBe(15);
    expect(await lockLen()).toBe(30);
    expect(await lockLen()).toBe(60);
  });

  it("caps sign-in attempts per address per minute", async () => {
    const ip = nextIp();
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await t.http().set("Origin", WEB).set("X-Forwarded-For", ip).post("/api/auth/sign-in/email").send({ email: uniqueEmail("spray"), password: "Password-1234" })).status;
    expect(last).toBe(429);
  });
});

describe("authorisation", () => {
  it("requires a session by default", async () => {
    const res = await t.http().get("/api/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    await t.http().get("/api/admin/dashboard").expect(401);
  });

  it("keeps members out of the admin API", async () => {
    const m = await signedInMember(t, { approve: true });
    await m.agent.get("/api/admin/dashboard").expect(403);
    await m.agent.get("/api/admin/members").expect(403);
  });

  it("keeps editors out of security and staff management", async () => {
    const e = await signedInStaff(t, "editor");
    await e.agent.get("/api/admin/dashboard").expect(200);
    await e.agent.get("/api/admin/security/overview").expect(403);
    await e.agent.get("/api/admin/staff").expect(403);
  });

  it("an admin cannot block their own address", async () => {
    const a = await signedInStaff(t, "admin");
    const res = await a.agent.post("/api/admin/security/ip-rules").send({ cidr: a.ip, action: "block", reason: "oops" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_BLOCK");
  });

  it("an admin can unlock a locked account", async () => {
    const a = await signedInStaff(t, "admin");
    const victim = uniqueEmail("locked");
    for (let i = 0; i < 5; i++) await t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp()).post("/api/auth/sign-in/email").send({ email: victim, password: "nope-nope-1" });
    const locks = await a.agent.get("/api/admin/security/lockouts").expect(200);
    expect(locks.body.some((l: { key: string }) => l.key === accountKey(victim))).toBe(true);
    await a.agent.post("/api/admin/security/lockouts/unlock-email").send({ email: victim }).expect(204);
    const after = await a.agent.get("/api/admin/security/lockouts").expect(200);
    expect(after.body.some((l: { key: string }) => l.key === accountKey(victim))).toBe(false);
  });
});

describe("audit log", () => {
  it("is append-only at the database level", async () => {
    await t.db.insert(schema.auditLogs).values({ action: "test.entry" });
    const reason = (p: Promise<unknown>) => p.then(() => "no error", (e: { cause?: { message?: string }; message: string }) => e.cause?.message ?? e.message);
    expect(await reason(t.db.execute(sql`UPDATE audit_logs SET action = 'tampered' WHERE action = 'test.entry'`))).toMatch(/append-only/);
    expect(await reason(t.db.execute(sql`DELETE FROM audit_logs WHERE action = 'test.entry'`))).toMatch(/append-only/);
  });
});

