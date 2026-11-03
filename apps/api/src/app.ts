/**
 * Builds the HTTP application: middleware order matters and is the same in
 * production and in tests.
 */
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { AppModule, type AppOptions } from "./app.module.js";
import { AuthService } from "./auth/auth.service.js";
import type { Env } from "./config/env.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";
import { PinoNestLogger } from "./common/logger.js";
import { currentContext } from "./common/request-context.js";
import { IpRulesService } from "./security/ip-rules.service.js";
import { RateLimitService } from "./security/rate-limit.service.js";
import { createSecurityMiddleware } from "./security/security.middleware.js";
import { StorageService } from "./storage/storage.service.js";

export async function createApp(env: Env, logger: Logger, opts: AppOptions): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env, opts), {
    bodyParser: false,
    logger: new PinoNestLogger(logger),
    abortOnError: false,
  });
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.disable("x-powered-by");
  server.set("trust proxy", false); // client IPs are resolved by SecurityMiddleware from TRUSTED_PROXIES

  const allowedOrigins = new Set([new URL(env.WEB_URL).origin, ...env.TRUSTED_ORIGINS.map((o) => new URL(o).origin)]);

  // 1. Client IP, request context, IP blocks, rate limits, CSRF origin check.
  app.use(createSecurityMiddleware(env, app.get(IpRulesService), app.get(RateLimitService)));

  // 2. Access log (no query strings: they can carry tokens).
  app.use(
    pinoHttp({
      logger,
      genReqId: () => currentContext()?.requestId ?? "-",
      customProps: () => ({ ip: currentContext()?.ip, userId: currentContext()?.userId }),
      autoLogging: { ignore: (req) => (req.url ?? "").startsWith("/api/health") },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, path: req.url.split("?")[0] }),
        res: (res: { statusCode: number }) => ({ status: res.statusCode }),
      },
    }),
  );

  // 3. Security headers. The API only returns JSON and images, so the CSP forbids everything.
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      strictTransportSecurity: env.NODE_ENV === "production" ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: "no-referrer" },
    }),
  );

  // 4. CORS only for our own sites (the website normally calls through its own origin anyway).
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["content-type", "x-captcha-response", "x-request-id"],
    maxAge: 600,
  });

  // 5. Better Auth reads its own body, so it is mounted before the JSON parser.
  const authHandler = toNodeHandler(app.get(AuthService).auth);
  server.all("/api/auth/*splat", (req, res) => void authHandler(req, res));

  // 6. JSON bodies: small, strict, JSON only (no urlencoded forms = no classic form CSRF).
  const json = express.json({ limit: "100kb", strict: true, type: "application/json" });
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => (req.path.startsWith("/api/auth/") ? next() : json(req, res, next)));

  // 7. Uploaded files (local storage only; S3/R2 serves its own).
  if (env.STORAGE_DRIVER === "local") {
    server.use(
      "/api/media",
      express.static(app.get(StorageService).localRoot, {
        dotfiles: "deny",
        index: false,
        redirect: false,
        immutable: true,
        maxAge: "365d",
        setHeaders: (res) => {
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        },
      }),
    );
  }

  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.init();

  const http = app.getHttpServer() as import("node:http").Server;
  http.requestTimeout = 30_000;
  http.headersTimeout = 15_000;
  http.keepAliveTimeout = 65_000; // longer than typical load-balancer idle timeouts
  return app;
}
