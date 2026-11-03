import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

/**
 * Local development without apps/web/.env.local: take the few settings the
 * website shares with the API from the repository's root .env, so the site
 * reads the database through the API with no extra setup. Only these keys
 * are read (the root .env also holds database and auth secrets the website
 * must not have), and values already set (.env.local, Docker) always win.
 */
const SHARED_WITH_API = ["API_INTERNAL_URL", "INTERNAL_API_TOKEN", "REVALIDATE_SECRET", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"];
const rootEnv = path.join(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) {
  const parsed = parseEnv(readFileSync(rootEnv, "utf8"));
  for (const key of SHARED_WITH_API) if (!process.env[key] && parsed[key]) process.env[key] = parsed[key];
}

const dev = process.env.NODE_ENV !== "production";
/** Old ritechs.org /blog/details/<id> → new article. Posts 2 and 3 repeated post 1 on the old site. */
const legacyBlogRedirects: Record<string, string> = {
  "1": "itss-ioe-2021-opening",
  "2": "itss-ioe-2021-opening",
  "3": "itss-ioe-2021-opening",
  "4": "closing-first-international-conference-smart-technology",
  "5": "ritechs-seminar-2022",
  "6": "reflections-on-icetcs-2024",
  "7": "mastering-quantitative-data-analysis",
};
/** NestJS API on the private network; the browser only ever talks to this site's origin. */
const apiInternal = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "";

/**
 * Where images and files come from: the old server (or its copy, NEXT_PUBLIC_LEGACY_ASSET_BASE)
 * and the bucket for new uploads (NEXT_PUBLIC_MEDIA_URL, e.g. Cloudflare R2). Both are allowed in
 * the CSP and for next/image. Must match LEGACY_ASSET_BASE / MEDIA_PUBLIC_URL on the API.
 */
const mediaOrigins = [...new Set(["https://ritechs.org", process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE, process.env.NEXT_PUBLIC_MEDIA_URL].flatMap((u) => (u && /^https:\/\//.test(u) ? [new URL(u)] : [])).map((u) => u.origin))];
const mediaSrc = mediaOrigins.join(" ");

/**
 * Content Security Policy. Next.js needs inline scripts for hydration, so
 * script-src keeps 'unsafe-inline' but nothing may load from other sites,
 * frames are refused, and plugins/base-tag tricks are disabled.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaSrc}`,
  `media-src 'self' ${mediaSrc}`,
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: http://localhost:*" : ""}`,
  `frame-src${turnstile || " 'none'"}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (traced from the monorepo root). Vercel builds its own.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Mentor photos and partner logos still live on the old server (see lib/assets.ts).
    remotePatterns: [
      { protocol: "https", hostname: "ritechs.org", pathname: "/uploads/**" },
      ...mediaOrigins.filter((o) => o !== "https://ritechs.org").map((o) => ({ protocol: "https" as const, hostname: new URL(o).hostname, pathname: "/**" })),
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pages that carry one-time tokens in the URL must never leak them via Referer or caches.
      { source: "/(reset-password|newsletter/:path*|account)", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  /** Same-origin API: cookies stay first-party and the browser never needs CORS. */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternal}/api/:path*` }];
  },
  /** Old ritechs.org URLs that changed, so bookmarks and search results keep working. */
  async redirects() {
    return [
      { source: "/blog/list", destination: "/news", permanent: true },
      // Old page addresses (ritechs.org/index/<page>). Designed pages keep their own address; others are under /pages.
      ...Object.entries({ aboutus: "/aboutus", mission: "/mission", corevalue: "/corevalue", "future-goal": "/future-goal", procedure: "/procedure", employees: "/employees", membership: "/membership", benefits: "/benefits", "why-join": "/why-join", subscription: "/subscription", joinus: "/register", "page-mentor": "/page-mentor", "page-mentee": "/page-mentee", "mentoring-directory": "/mentorship", event: "/event", seminar: "/seminar", botcamp: "/botcamp", "research-adda": "/research-adda", cyber4me: "/cyber4me", solutions: "/solutions", publication: "/publication", "academic-modification": "/academic-modification", poster: "/poster", eLearning: "/eLearning", TrainingPartner: "/TrainingPartner", archives: "/archives", gallery: "/gallery", conference: "/conference", home: "/" }).map(([from, to]) => ({ source: `/index/${from}`, destination: to, permanent: true })),
      { source: "/index", destination: "/", permanent: true },
      { source: "/index/:slug", destination: "/pages/:slug", permanent: true },
      // ETCCE 2021 had its own pages under ritechs.org/ETCCE2021 on the old site.
      { source: "/ETCCE2021/:path*", destination: "/conferences/ETCCE2021", permanent: true },
      ...Object.entries(legacyBlogRedirects).map(([id, slug]) => ({
        source: `/blog/details/${id}`,
        destination: `/news/${slug}`,
        permanent: true,
      })),
      { source: "/mentor-common-view/:id", destination: "/mentorship/:id", permanent: true },
      { source: "/mentor-list", destination: "/mentorship", permanent: true },
      { source: "/page-conference", destination: "/conference", permanent: true },
      { source: "/conference/:slug", destination: "/conferences/:slug", permanent: true },
      { source: "/login-page", destination: "/login", permanent: true },
      { source: "/mentor-register", destination: "/register/mentor", permanent: true },
      { source: "/mentee-register", destination: "/register/mentee", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      // The old member area's pages, now in the member dashboard (/dashboard).
      ...Object.entries({ user_profile: "/profile", biography: "/biography", social_link: "/profile", research: "/scholar", project: "/projects", project_add: "/projects", expertise: "/expertise", resource: "/resources", "connected-mentee": "/people", similarmentor: "/people", similarmentee: "/people", funding: "/funding", myapply: "/requests?box=out", "user-request": "/requests", communication: "/messages", chat: "/messages", setting: "/settings", changepassword: "/settings", "membership-change": "/settings", bookings: "/requests", "schedule-timings": "", invoices: "", reviews: "" }).map(([from, to]) => ({ source: `/${from}`, destination: `/dashboard${to}`, permanent: false })),
      { source: "/admin/login", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
