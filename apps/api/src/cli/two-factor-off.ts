/**
 * Turns two-step verification off for one account (for example, an admin who
 * set it up while it was required, or who lost their phone):
 *
 *   npm run 2fa:off -- --email you@ritechs.org
 *
 * Removes the authenticator secret and backup codes, and signs the account out
 * everywhere so the next sign-in needs only the password. Recorded in the audit log.
 */
import "reflect-metadata";
import { createDb, createPool, schema } from "@ritechs/db";
import { eq, sql } from "drizzle-orm";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { email: { type: "string" } } });
if (!values.email) {
  console.error("Usage: npm run 2fa:off -- --email you@ritechs.org");
  process.exit(1);
}
const email = values.email.trim().toLowerCase();
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const pool = createPool({ url, max: 1, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-cli" });
const db = createDb(pool);
try {
  const [user] = await db.select({ id: schema.user.id, on: schema.user.twoFactorEnabled }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`);
  if (!user) {
    console.error(`No account with the email ${email}.`);
    process.exitCode = 1;
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, user.id));
      await tx.update(schema.user).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(schema.user.id, user.id));
      await tx.delete(schema.session).where(eq(schema.session.userId, user.id));
      await tx.insert(schema.auditLogs).values({ action: "auth.2fa_disabled_by_cli", entityType: "user", entityId: user.id });
    });
    console.log(user.on ? `Two-step verification is now off for ${email}. Sign in again with just the password.` : `${email} did not have two-step verification on. Nothing to change.`);
  }
} finally {
  await pool.end();
}
