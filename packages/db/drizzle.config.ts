import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs from packages/db; read the repository's root .env if present.
if (!process.env.DATABASE_URL && existsSync("../../.env")) process.loadEnvFile("../../.env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgres://ritechs:ritechs@127.0.0.1:5432/ritechs" },
  strict: true,
  verbose: true,
});
