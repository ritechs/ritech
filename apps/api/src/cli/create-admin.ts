/**
 * Creates (or promotes) an administrator. Run once after the first deploy:
 *
 *   npm run admin:create -- --email you@ritechs.org --name "Your Name"
 *
 * The password is read from ADMIN_PASSWORD or typed at a hidden prompt; it is
 * never passed on the command line (shell history). Two-step verification is
 * optional unless REQUIRE_STAFF_2FA=true.
 */
import "reflect-metadata";
import { createDb, createPool, schema } from "@ritechs/db";
import { password as passwordRule } from "@ritechs/shared";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
if (!values.email || !values.name) {
  console.error('Usage: npm run admin:create -- --email you@ritechs.org --name "Your Name"');
  process.exit(1);
}
const email = values.email.trim().toLowerCase();

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => write(s.startsWith(question) ? s : "*");
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const pw = process.env.ADMIN_PASSWORD ?? (await prompt("Password (min 12 chars): "));
const check = passwordRule.safeParse(pw);
if (!check.success || pw.length < 12) {
  console.error("Password rejected: use at least 12 characters with letters and numbers.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const pool = createPool({ url, max: 1, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-cli" });
const db = createDb(pool);
try {
  const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`);
  const hash = await hashPassword(pw);
  if (existing) {
    await db.update(schema.user).set({ role: "admin", emailVerified: true, banned: false, updatedAt: new Date() }).where(eq(schema.user.id, existing.id));
    await db.update(schema.account).set({ password: hash, updatedAt: new Date() }).where(eq(schema.account.userId, existing.id));
    await db.insert(schema.auditLogs).values({ action: "staff.promoted_by_cli", entityType: "user", entityId: existing.id });
    console.log(`Promoted ${email} to admin and set the new password.`);
  } else {
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(schema.user).values({ id, name: values.name!, email, emailVerified: true, role: "admin" });
      await tx.insert(schema.account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash, updatedAt: new Date() });
      await tx.insert(schema.auditLogs).values({ action: "staff.created_by_cli", entityType: "user", entityId: id });
    });
    console.log(`Created admin ${email}. Sign in at /login to open the admin area. Two-step verification can be turned on in My Account.`);
  }
} finally {
  await pool.end();
}
