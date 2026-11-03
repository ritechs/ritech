/**
 * Copies every file the site still loads from the old server (member and
 * speaker photos, logos, conference posters and PDFs, news and gallery
 * photos) into a folder, so the old server can be switched off.
 *
 *   npm run legacy:assets -w @ritechs/api -- --out ../web/public/legacy
 *
 * Then set LEGACY_ASSET_BASE=/legacy (API) and NEXT_PUBLIC_LEGACY_ASSET_BASE=/legacy
 * (website) and rebuild the website so the files ship in public/legacy.
 * Safe to re-run: files already downloaded are skipped.
 */
import { createDb, createPool } from "@ritechs/db";
import { sql } from "drizzle-orm";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { out: { type: "string" }, source: { type: "string", default: process.env.LEGACY_SOURCE ?? "https://ritechs.org" } } });
if (!values.out) {
  console.error("Usage: npm run legacy:assets -w @ritechs/api -- --out <folder>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const pool = createPool({ url, max: 1, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-legacy-assets", statementTimeoutMs: 0 });
const db = createDb(pool);
try {
  const r = await db.execute<{ p: string }>(sql`
    SELECT legacy_photo_path AS p FROM member_profiles WHERE legacy_photo_path IS NOT NULL
    UNION SELECT legacy_photo_path FROM speakers WHERE legacy_photo_path IS NOT NULL
    UNION SELECT legacy_logo_path FROM organisations WHERE legacy_logo_path IS NOT NULL
    UNION SELECT legacy_cover_path FROM conferences WHERE legacy_cover_path IS NOT NULL
    UNION SELECT legacy_call_for_papers_path FROM conferences WHERE legacy_call_for_papers_path IS NOT NULL
    UNION SELECT legacy_camera_ready_path FROM conferences WHERE legacy_camera_ready_path IS NOT NULL
    UNION SELECT legacy_cover_path FROM news_posts WHERE legacy_cover_path IS NOT NULL
    UNION SELECT legacy_path FROM gallery_items WHERE legacy_path IS NOT NULL`);
  // Files the website itself links to (the homepage video and its poster).
  r.rows.push({ p: "uploads/1636987699.mp4" }, { p: "uploads/1638943501.png" });
  const out = path.resolve(values.out);
  const base = values.source!.replace(/\/$/, "");
  let ok = 0, skipped = 0, failed = 0;
  for (const { p } of r.rows) {
    // Paths come from our own import ("uploads/<name>"); refuse anything that could escape the folder.
    if (!/^uploads\/[\w.-]+$/.test(p)) continue;
    const dest = path.join(out, p);
    try {
      await access(dest);
      skipped++;
      continue;
    } catch {}
    try {
      const res = await fetch(`${base}/${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (err) {
      failed++;
      console.warn(`✗ ${p}: ${(err as Error).message}`);
    }
  }
  console.log(`${r.rows.length} files referenced · ${ok} downloaded · ${skipped} already present · ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
} finally {
  await pool.end();
}
