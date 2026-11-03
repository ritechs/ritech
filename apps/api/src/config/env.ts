/**
 * Environment configuration, validated once at start-up. The process refuses
 * to boot with a missing secret or an insecure production setting, rather
 * than running in a half-configured state.
 */
import { z } from "zod";

const bool = (def: boolean) =>
  z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : v === "true" || v === "1"));
const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: bool(false),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    /** Public origin of the website, e.g. https://ritechs.org. Auth links in emails point here. */
    WEB_URL: z.url(),
    /** Extra origins allowed to call the API from a browser (comma-separated). WEB_URL is always allowed. */
    TRUSTED_ORIGINS: csv,

    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 48)."),
    /** Server-to-server token used by the Next.js server; exempt from per-IP rate limits. */
    INTERNAL_API_TOKEN: z.string().min(32).optional(),

    /**
     * Reverse proxies whose X-Forwarded-For we believe (IPs or CIDRs): the load
     * balancer, Cloudflare ranges and the Next.js server. Empty = use the TCP peer.
     */
    TRUSTED_PROXIES: csv,
    /** Optional single-value header set by a trusted edge, e.g. "cf-connecting-ip". Read only from trusted proxies. */
    CLIENT_IP_HEADER: z.string().toLowerCase().optional(),
    /**
     * Shared secret between the website and the API when they run on different hosts
     * (e.g. Vercel + Render). The website's proxy sends it with the visitor's IP, which
     * the API then trusts instead of the TCP peer. Never send it to browsers.
     */
    EDGE_PROXY_SECRET: z.string().min(32, "EDGE_PROXY_SECRET must be at least 32 characters (openssl rand -base64 48).").optional(),

    /**
     * When true, admins must turn on two-step verification before using the admin area.
     * Off by default: everyone (admins included) may turn it on in My Account → Security.
     */
    REQUIRE_STAFF_2FA: bool(false),
    PASSWORD_BREACH_CHECK: bool(true),
    TURNSTILE_SECRET_KEY: z.string().optional(),

    SMTP_URL: z.string().optional(),
    /**
     * Sends mail over HTTPS (resend.com) instead of SMTP. Needed on hosts that block SMTP
     * ports, such as Render's free plan. Used instead of SMTP_URL when both are set.
     */
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().default("RiTECHS <no-reply@ritechs.org>"),
    /** Where security notifications (new IP blocks, account lockouts) go. */
    SECURITY_ALERT_EMAIL: z.email().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("./uploads"),
    MEDIA_PUBLIC_URL: z.string().optional(),
    /** Where files uploaded to the old site are served: the old server, or a copy made with `legacy:assets` (e.g. "/legacy"). */
    LEGACY_ASSET_BASE: z.union([z.url(), z.string().regex(/^\/[\w/-]*$/)]).default("https://ritechs.org"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    /** Run the job worker inside the API process (fine for one server). Use `npm run start:worker` to split it out. */
    WORKER_IN_PROCESS: bool(true),
    /**
     * For databases that pause when idle (Neon, Supabase): poll the job queue and IP rules
     * rarely instead of every second, so the database can sleep between visits and stays
     * within free or low compute hours. Jobs created by this process still run at once.
     */
    DB_SCALE_TO_ZERO: bool(false),
    /** Next.js on-demand revalidation endpoint and its secret. */
    WEB_REVALIDATE_URL: z.url().optional(),
    REVALIDATE_SECRET: z.string().min(24).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== "production") return;
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!e.WEB_URL.startsWith("https://")) fail("WEB_URL", "must be https in production");
    for (const o of e.TRUSTED_ORIGINS) if (!o.startsWith("https://")) fail("TRUSTED_ORIGINS", `${o} must be https in production`);
    if (!e.SMTP_URL && !e.RESEND_API_KEY) fail("SMTP_URL", "or RESEND_API_KEY is required in production (verification and reset emails)");
    if (!e.INTERNAL_API_TOKEN) fail("INTERNAL_API_TOKEN", "is required in production");
    if (!e.DATABASE_SSL && !/@(localhost|127\.0\.0\.1|postgres|db)[:/]/.test(e.DATABASE_URL))
      fail("DATABASE_SSL", "must be true when the database is on another host");
    if (e.STORAGE_DRIVER === "s3" && !(e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY))
      fail("S3_BUCKET", "S3 storage needs S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  return Object.freeze(parsed.data);
}

export const ENV = Symbol("ENV");
