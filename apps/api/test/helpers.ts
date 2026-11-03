import { expect } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import pino from "pino";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadEnv, type Env } from "../src/config/env.js";
import { DB } from "../src/database/database.module.js";
import { JobsService } from "../src/jobs/jobs.service.js";
import { MailService } from "../src/mail/mail.service.js";

export const WEB = "http://localhost:3000";

export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: "test",
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://ritechs:ritechs@127.0.0.1:5432/ritechs_test",
    WEB_URL: WEB,
    BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123456789",
    INTERNAL_API_TOKEN: "internal-token-internal-token-internal-token",
    TRUSTED_PROXIES: "127.0.0.1/32,::1/128",
    PASSWORD_BREACH_CHECK: "false",
    REQUIRE_STAFF_2FA: "false",
    UPLOAD_DIR: "/tmp/ritechs-test-uploads",
    LOG_LEVEL: "fatal",
    ...overrides,
  });
}

export interface TestApp {
  app: INestApplication;
  db: Database;
  http: () => ReturnType<typeof request.agent>;
  /** Runs queued background jobs (emails) now. */
  drain: () => Promise<void>;
  close: () => Promise<void>;
}

export async function startApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const app = await createApp(testEnv(overrides), pino({ level: "silent" }), { worker: false, cron: false });
  const db = app.get<Database>(DB);
  const jobs = app.get(JobsService);
  return {
    app,
    db,
    http: () => request.agent(app.getHttpServer()),
    drain: async () => {
      await db.execute(sql`UPDATE jobs SET run_at = now() WHERE status = 'queued'`);
      while ((await jobs.runOnce(50)) > 0) {
        /* keep going */
      }
    },
    close: () => app.close(),
  };
}

let seq = 0;
const base = Math.floor(Math.random() * 60);
/** A distinct client address per call (unique across test files), so limits and blocks never leak between tests. */
export const nextIp = () => {
  seq++;
  return `100.${64 + ((base + Math.floor(seq / 62500)) % 64)}.${Math.floor(seq / 250) % 250}.${(seq % 250) + 1}`;
};
export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.org`;

export const lastMailTo = (to: string, subject?: RegExp) => [...MailService.outbox].reverse().find((m) => m.to === to && (!subject || subject.test(m.subject)));
export const linkIn = (text: string, pattern: RegExp) => text.match(pattern)?.[0];

export const mentorBody = (emailAddr: string, password = "Correct-Horse-42") => ({
  type: "mentor",
  firstName: "Ada",
  lastName: "Lovelace",
  email: emailAddr,
  phone: { country: "GB", number: "07911 123456" },
  gender: "Female",
  affiliation: "University of Leeds",
  country: "GB",
  position: "Professor",
  qualification: "Ph.D.",
  bio: "Researcher in analytical engines and the poetry of mathematics, mentoring early-career researchers.",
  password,
  privacy: true,
});

/** Registers, verifies the email and returns a signed-in agent. */
export async function signedInMember(t: TestApp, opts: { approve?: boolean; ip?: string } = {}) {
  const ip = opts.ip ?? nextIp();
  const emailAddr = uniqueEmail("member");
  const agent = t.http().set("Origin", WEB).set("X-Forwarded-For", ip);
  await agent.post("/api/members/register").send(mentorBody(emailAddr)).expect(202);
  await t.drain();
  const verify = linkIn(lastMailTo(emailAddr, /confirm your email/i)!.text, /http:\/\/localhost:3000\/api\/auth\/verify-email\?\S+/)!;
  await agent.get(verify.replace(WEB, "")).expect((r) => expect([200, 302]).toContain(r.status));
  await agent.post("/api/auth/sign-in/email").send({ email: emailAddr, password: "Correct-Horse-42" }).expect(200);
  const [u] = await t.db.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${emailAddr}`);
  if (opts.approve) await t.db.update(schema.memberProfiles).set({ status: "approved" }).where(sql`${schema.memberProfiles.userId} = ${u!.id}`);
  return { agent, email: emailAddr, userId: u!.id, ip };
}

/** Creates a staff user directly in the database and signs them in. */
export async function signedInStaff(t: TestApp, role: "admin" | "editor" = "admin") {
  const ip = nextIp();
  const emailAddr = uniqueEmail(role);
  const agent = t.http().set("Origin", WEB).set("X-Forwarded-For", ip);
  const { hashPassword } = await import("better-auth/crypto");
  const id = crypto.randomUUID();
  await t.db.insert(schema.user).values({ id, name: `Test ${role}`, email: emailAddr, emailVerified: true, role });
  await t.db.insert(schema.account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword("Staff-Password-99"), updatedAt: new Date() });
  await agent.post("/api/auth/sign-in/email").send({ email: emailAddr, password: "Staff-Password-99" }).expect(200);
  return { agent, email: emailAddr, userId: id, ip };
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — what authenticator apps compute. */
export function totp(base32Secret: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of base32Secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
  return code;
}
