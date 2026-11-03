/**
 * Loads the repository's root `.env` for command-line scripts (migrate, seed,
 * drizzle-kit) so they work the same way on Windows, macOS and Linux.
 * Variables already set in the environment always win (production/CI).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function loadRootEnv(from = path.dirname(fileURLToPath(import.meta.url))) {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    const file = path.join(dir, ".env");
    if (existsSync(file) && existsSync(path.join(dir, "package.json"))) {
      try {
        process.loadEnvFile(file);
      } catch (err) {
        console.error(`Could not read ${file}: ${(err as Error).message}`);
        process.exit(1);
      }
      return file;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

export function requireDatabaseUrl(name = "DATABASE_URL"): string {
  const url = process.env[name] ?? process.env.DATABASE_URL;
  if (!url) {
    console.error(
      `DATABASE_URL is not set. Add it to the .env file in the repository root, e.g.\n  DATABASE_URL=postgres://ritechs:your-password@127.0.0.1:5432/ritechs`,
    );
    process.exit(1);
  }
  return url;
}
