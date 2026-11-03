/**
 * Settings for hosting the website and the API on different providers
 * (Vercel + Render) with a database that pauses when idle (Neon).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JobsService } from "../src/jobs/jobs.service.js";
import { IpRulesService } from "../src/security/ip-rules.service.js";
import { startApp, type TestApp } from "./helpers.js";

const SECRET = "edge-secret-edge-secret-edge-secret-0123456789";
let t: TestApp;
beforeAll(async () => {
  // Like Render: the peer is the platform's load balancer, which is not a trusted proxy.
  t = await startApp({ TRUSTED_PROXIES: "", EDGE_PROXY_SECRET: SECRET, DB_SCALE_TO_ZERO: "true" });
  await t.app.get(IpRulesService).addRule({ cidr: "198.51.100.0/24", action: "block", reason: "test", expiresAt: null, source: "manual", createdBy: null });
});
afterAll(async () => {
  await t.close();
});

describe("visitor IP from the website's proxy", () => {
  it("trusts the visitor IP only with the shared secret", async () => {
    await t.http().set("X-Ritechs-Edge-Secret", SECRET).set("X-Ritechs-Edge-Ip", "198.51.100.7").get("/api/conferences").expect(403);
    // Wrong or missing secret: the header is ignored and the TCP peer is used.
    await t.http().set("X-Ritechs-Edge-Secret", "x".repeat(SECRET.length)).set("X-Ritechs-Edge-Ip", "198.51.100.7").get("/api/conferences").expect(200);
    await t.http().set("X-Ritechs-Edge-Ip", "198.51.100.7").get("/api/conferences").expect(200);
    // X-Forwarded-For from an untrusted peer stays ignored.
    await t.http().set("X-Forwarded-For", "198.51.100.7").get("/api/conferences").expect(200);
  });

  it("ignores a malformed visitor IP", async () => {
    await t.http().set("X-Ritechs-Edge-Secret", SECRET).set("X-Ritechs-Edge-Ip", "not-an-ip").get("/api/conferences").expect(200);
  });

  it("rejects a short EDGE_PROXY_SECRET at start-up", async () => {
    await expect(startApp({ EDGE_PROXY_SECRET: "short" })).rejects.toThrow(/EDGE_PROXY_SECRET/);
  });
});

describe("idle-friendly job queue", () => {
  it("wakes the worker when a job is queued now, not for later jobs", async () => {
    const jobs = t.app.get(JobsService);
    let woken = 0;
    const off = jobs.onEnqueue(() => woken++);
    await jobs.enqueue("email", { to: "a@example.org", template: "x", data: {} });
    await jobs.enqueue("email", { to: "a@example.org", template: "x", data: {} }, { runAt: new Date(Date.now() + 3600_000) });
    off();
    await jobs.enqueue("email", { to: "a@example.org", template: "x", data: {} });
    expect(woken).toBe(1);
    const due = await jobs.nextDueAt();
    expect(due).toBeInstanceOf(Date);
    expect(due!.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe("email over HTTPS (Resend)", () => {
  it("posts the message to Resend and fails the job when Resend refuses", async () => {
    const { MailService } = await import("../src/mail/mail.service.js");
    const { testEnv } = await import("./helpers.js");
    const jobsStub = { register: () => {}, enqueue: async () => null } as unknown as JobsService;
    const mail = new MailService(testEnv({ RESEND_API_KEY: "re_test" }), jobsStub);
    const real = globalThis.fetch;
    const calls: { url: string; body: { to: string[] }; auth: string }[] = [];
    let status = 200;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).Authorization) });
      return new Response(status === 200 ? "{}" : "invalid", { status });
    }) as typeof fetch;
    try {
      const data = { name: "Ada", link: "https://example.org/verify?token=x" };
      await mail.deliver("to@example.org", "verify-email", data);
      expect(calls[0]?.url).toBe("https://api.resend.com/emails");
      expect(calls[0]?.auth).toBe("Bearer re_test");
      expect(calls[0]?.body.to).toEqual(["to@example.org"]);
      status = 422;
      await expect(mail.deliver("to@example.org", "verify-email", data)).rejects.toThrow(/Resend responded 422/);
    } finally {
      globalThis.fetch = real;
    }
  });
});
