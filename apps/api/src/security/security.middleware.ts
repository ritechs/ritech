/**
 * The first thing every request meets, before routing or authentication:
 *   1. resolve the real client address (trusted proxies only)
 *   2. reject blocked addresses
 *   3. apply rate limits (and block addresses that keep hitting them)
 *   4. reject cross-site state-changing requests (CSRF defence in depth)
 * It also opens the per-request context used for logging and auditing.
 */
import type { NextFunction, Request, Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Env } from "../config/env.js";
import { requestContext } from "../common/request-context.js";
import { ipKey, normaliseIp } from "./client-ip.js";
import type { IpRulesService } from "./ip-rules.service.js";
import { policiesFor, VIOLATION_WINDOW_SEC, VIOLATIONS_BEFORE_BLOCK } from "./rate-limit.policies.js";
import type { RateLimitService } from "./rate-limit.service.js";

/** Header carrying the resolved client IP to Better Auth. Any client-supplied value is discarded. */
export const CLIENT_IP_HEADER = "x-ritechs-client-ip";
/** Sent by the website's proxy (apps/web/proxy.ts) when the site and the API run on different hosts. */
export const EDGE_SECRET_HEADER = "x-ritechs-edge-secret";
export const EDGE_IP_HEADER = "x-ritechs-edge-ip";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const deny = (res: Response, status: number, code: string, message: string, headers: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.status(status).json({ error: { code, message } });
};

export function createSecurityMiddleware(env: Env, ipRules: IpRulesService, limiter: RateLimitService) {
  const allowedOrigins = new Set([new URL(env.WEB_URL).origin, ...env.TRUSTED_ORIGINS.map((o) => new URL(o).origin)]);

  return async function security(req: Request, res: Response, next: NextFunction) {
    // The website's proxy vouches for the visitor's address with the shared secret; anything else
    // (a missing or wrong secret, a malformed address) falls back to the trusted-proxy rules.
    const edgeSecret = String(req.headers[EDGE_SECRET_HEADER] ?? "");
    const fromEdge = !!env.EDGE_PROXY_SECRET && edgeSecret.length > 0 && safeEqual(edgeSecret, env.EDGE_PROXY_SECRET);
    const edgeIp = fromEdge ? normaliseIp(String(req.headers[EDGE_IP_HEADER] ?? "").split(",")[0]) : null;
    delete req.headers[EDGE_SECRET_HEADER];
    delete req.headers[EDGE_IP_HEADER];
    const ip = edgeIp ?? ipRules.resolver.resolve(req);
    delete req.headers[CLIENT_IP_HEADER];
    req.headers[CLIENT_IP_HEADER] = ip;

    const incomingId = String(req.headers["x-request-id"] ?? "");
    // Keep the edge proxy's request id for log correlation; never trust one from the open internet.
    const peer = normaliseIp(req.socket.remoteAddress);
    const fromProxy = fromEdge || (!!peer && ipRules.resolver.isTrustedProxy(peer));
    const requestId = fromProxy && /^[\w-]{8,64}$/.test(incomingId) ? incomingId : randomUUID();
    res.setHeader("X-Request-Id", requestId);

    const token = String(req.headers["x-internal-token"] ?? "");
    const internal = !!env.INTERNAL_API_TOKEN && token.length > 0 && safeEqual(token, env.INTERNAL_API_TOKEN);
    delete req.headers["x-internal-token"];

    const ctx = { requestId, ip, userAgent: req.headers["user-agent"], internal };
    return requestContext.run(ctx, async () => {
      try {
        // Health checks must answer even under attack (load balancer probes).
        if (req.path.startsWith("/api/health")) return next();

        if (!internal) {
          const verdict = ipRules.check(ip);
          if (verdict.blocked) return deny(res, 403, "ACCESS_DENIED", "Access from your network has been blocked. Contact info@ritechs.org if you think this is a mistake.");

          if (!verdict.allowListed) {
            const key = ipKey(ip);
            for (const p of policiesFor(req.method, req.path)) {
              const r = await limiter.consume(`${p.name}:${key}`, p.limit, p.windowSec);
              res.setHeader("RateLimit-Policy", `${p.limit};w=${p.windowSec}`);
              res.setHeader("RateLimit", `limit=${r.limit}, remaining=${r.remaining}, reset=${Math.max(0, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000))}`);
              if (!r.allowed) {
                const retry = Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000));
                const v = await limiter.consume(`violations:${key}`, VIOLATIONS_BEFORE_BLOCK, VIOLATION_WINDOW_SEC);
                if (!v.allowed) await ipRules.autoBlock(ip, `Exceeded rate limits ${VIOLATIONS_BEFORE_BLOCK} times in 10 minutes`);
                return deny(res, 429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.", { "Retry-After": String(retry) });
              }
            }
          }
        }

        // CSRF: browsers always send Origin on cross-site POST/PUT/PATCH/DELETE.
        if (!SAFE_METHODS.has(req.method) && !internal) {
          const origin = req.headers.origin ?? (req.headers.referer ? safeOrigin(req.headers.referer) : undefined);
          if (!origin || !allowedOrigins.has(origin)) return deny(res, 403, "BAD_ORIGIN", "This request was blocked because it did not come from the RiTECHS website.");
          const type = String(req.headers["content-type"] ?? "");
          const hasBody = Number(req.headers["content-length"] ?? 0) > 0 || !!req.headers["transfer-encoding"];
          if (hasBody && !/^(application\/json|multipart\/form-data)/i.test(type))
            return deny(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON or multipart form data.");
        }
        next();
      } catch (err) {
        next(err);
      }
    });
  };
}

function safeOrigin(v: string) {
  try {
    return new URL(v).origin;
  } catch {
    return undefined;
  }
}
