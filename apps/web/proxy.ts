import { NextResponse, type NextRequest } from "next/server";

/**
 * When the website and the API run on different hosts (Vercel + Render), the API
 * only sees the hosting provider's addresses, so rate limits and IP blocks would
 * treat every visitor as one. This forwards /api requests to the API with the
 * visitor's address and a shared secret (EDGE_PROXY_SECRET) the API checks.
 *
 * Without EDGE_PROXY_SECRET (local development, Docker) nothing changes: the
 * /api rewrite in next.config.ts is used and the API reads X-Forwarded-For
 * from its trusted proxies.
 */
const secret = process.env.EDGE_PROXY_SECRET;
const api = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

/** The visitor's address as set by the hosting platform (Vercel overwrites these headers). */
function visitorIp(req: NextRequest) {
  return (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
}

export function proxy(request: NextRequest) {
  if (!secret) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set("x-ritechs-edge-secret", secret);
  headers.set("x-ritechs-edge-ip", visitorIp(request));
  const target = new URL(`${api}${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};
