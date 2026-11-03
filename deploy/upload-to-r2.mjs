#!/usr/bin/env node
/**
 * Uploads a folder to the Cloudflare R2 bucket (any S3-compatible bucket).
 * Used once, to move the old site's files (photos, logos, posters, PDFs) off the old server:
 *
 *   npm run legacy:assets -w @ritechs/api -- --out ../../.r2-legacy
 *   node deploy/upload-to-r2.mjs .r2-legacy legacy
 *
 * Reads S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY from the
 * root .env. Files already in the bucket with the same size are skipped, so it is
 * safe to run again.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));

const [folderArg, prefixArg = ""] = process.argv.slice(2);
if (!folderArg) {
  console.error("Usage: node deploy/upload-to-r2.mjs <folder> [prefix]");
  process.exit(1);
}
const need = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((k) => !process.env[k]);
if (need.length) {
  console.error(`Missing in .env: ${need.join(", ")}`);
  process.exit(1);
}

const TYPES = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".avif": "image/avif", ".bmp": "image/bmp", ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});
const Bucket = process.env.S3_BUCKET;
const folder = path.resolve(folderArg);
const prefix = prefixArg.replace(/^\/+|\/+$/g, "");

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

let uploaded = 0, skipped = 0, failed = 0;
for await (const file of walk(folder)) {
  const rel = path.relative(folder, file).split(path.sep).join("/");
  const Key = prefix ? `${prefix}/${rel}` : rel;
  const ext = path.extname(file).toLowerCase();
  const size = (await stat(file)).size;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key })).catch(() => null);
    if (head && head.ContentLength === size) {
      skipped++;
      continue;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: await readFile(file),
        ContentType: TYPES[ext] ?? "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
        // Anything that is not an image, video or PDF downloads instead of opening in the browser.
        ...(TYPES[ext] && /^(image|video)\/|pdf$/.test(TYPES[ext]) && ext !== ".svg" ? {} : { ContentDisposition: "attachment" }),
      }),
    );
    uploaded++;
    if (uploaded % 25 === 0) console.log(`… ${uploaded} uploaded`);
  } catch (err) {
    failed++;
    console.warn(`✗ ${Key}: ${err.message}`);
  }
}
console.log(`Done: ${uploaded} uploaded, ${skipped} already there, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
