# RiTECHS — System Design

## Overview

```
                 Internet
                    │  HTTPS (TLS 1.2+/1.3, HTTP/3)
              ┌─────▼─────┐
              │   Caddy   │  automatic certificates, compression, 12 MB body cap,
              └─────┬─────┘  sets X-Forwarded-For, hides /internal/*
                    │
              ┌─────▼─────┐   pre-rendered pages + cached data (Next.js Cache Components)
              │  Next.js  │   /api/*  ──rewrite──►  NestJS (same origin → first-party cookies)
              │   (web)   │   Server Components read the API with the internal token
              └─────┬─────┘
                    │ private network only
              ┌─────▼─────┐   SecurityMiddleware → Better Auth / NestJS controllers → guards
              │  NestJS   │   job worker (emails, campaigns, revalidation) in-process or separate
              │   (api)   │
              └─────┬─────┘
              ┌─────▼─────┐
              │ Postgres  │   data, sessions, rate-limit counters, login throttles,
              │    16     │   IP rules, job queue, append-only audit log
              └───────────┘
```

Three processes and one database. There is **no Redis**: everything that would
usually live there (rate limits, lockouts, job queue) is in Postgres, designed so
it stays cheap at this scale and keeps working with several API instances.

| Package | What it is |
| --- | --- |
| `apps/web` | Next.js 16 website. Public pages are pre-rendered; forms call `/api/*`. |
| `apps/api` | NestJS 12 API with Better Auth mounted at `/api/auth`. |
| `packages/db` | Drizzle schema, SQL migrations (in git), seed, least-privilege role script. |
| `packages/shared` | zod validation rules used by both the forms and the API. |

## Request path through the API

Order matters and is identical in production and tests (`apps/api/src/app.ts`):

1. **SecurityMiddleware** — resolves the real client IP (X-Forwarded-For is only
   believed from `TRUSTED_PROXIES`), rejects blocked addresses, applies rate limits,
   rejects cross-site POST/PUT/PATCH/DELETE (Origin check) and non-JSON bodies, and
   opens the per-request context (request id, IP, user) used by logs and the audit log.
2. **Access log** (pino, JSON) — no query strings or bodies; secrets redacted.
3. **Helmet** — `default-src 'none'` CSP, HSTS, no-referrer, nosniff, CORP.
4. **CORS** — only the site's own origins.
5. **Better Auth** at `/api/auth/*` (reads its own body).
6. **JSON body parser** — 100 KB limit, JSON only.
7. **NestJS controllers**, guarded by the global **AccessGuard**: every route needs a
   session unless marked `@Public()`; then `@Staff()` / `@AdminOnly()` (with mandatory
   2FA) and `@ApprovedMember()`.
8. **Exception filter** — consistent `{ error: { code, message, fields } }`, never a stack trace.

## Data model (main tables)

| Area | Tables |
| --- | --- |
| Accounts (Better Auth) | `user` (role: user / editor / admin, banned, 2FA flag), `session`, `account`, `verification`, `two_factor` |
| Members | `member_profiles` (type mentor/mentee, status pending/approved/rejected/suspended, legacy id), `expertise`, `member_expertise`, `membership_change_requests` |
| Conferences | `conferences` + `conference_tracks`, `_dates`, `_fees`, `_committee`, `_awards`, `sponsorship_packages`, `conference_speakers`, `conference_sponsors` |
| Events | `events`, `event_speakers`, `registrations` (event or conference, capacity + waitlist) |
| Content | `news_posts`, `pages`, `publications` (full-text search), `organisations` (partners/sponsors), `speakers`, `gallery_albums`, `gallery_items`, `media` |
| Inbox | `contact_messages`, `quote_requests`, `newsletter_subscribers` (double opt-in, hashed tokens) |
| Email | `mail_groups`, `mail_group_members`, `email_campaigns` |
| Security & infra | `ip_rules`, `auth_throttle`, `rate_limits` (UNLOGGED), `jobs`, `audit_logs` (append-only) |

Every old-site record type has a home, with `legacy_id` columns for the import.

## Capacity

Measured on a 2-vCPU sandbox that was also running Postgres, Next.js and the load
generator at the same time:

| Path | Throughput | Notes |
| --- | --- | --- |
| Full homepage (cached HTML) | ~200 pages/s | Served by Next.js without touching the API |
| Heaviest API read (conference with all sections) | ~116 req/s | Uncached; normally cached by Next.js |

12,000 visitors/day ≈ 50,000–80,000 page views/day ≈ **1 page/second on average**,
perhaps 10–20/s at a conference-deadline peak. One modest server (2 vCPU, 4 GB RAM)
has 10× headroom. Why it stays cheap:

- Public pages are pre-rendered and cached; the API is only hit when content changes
  (the API queues `/internal/revalidate` calls) or for forms and signed-in pages.
- Rate-limit checks first hit an in-memory pre-filter; a flood from one address never
  reaches Postgres.
- IP rules are cached in memory and refreshed every 10 s.
- Hot queries are indexed (directory, status filters, full-text search with GIN).
- Each process uses a bounded pool (`DATABASE_POOL_MAX`, default 10) with a 10 s statement timeout.

### Scaling out later

Everything is stateless apart from Postgres, so you can grow in steps:
1. Run 2+ API containers behind the web server (rate limits, lockouts and IP rules are
   shared through Postgres; maintenance tasks use advisory locks so only one instance runs them).
2. Set `WORKER_IN_PROCESS=false` on the API and run `npm run start:worker` separately.
3. Move uploads to R2/S3 (`STORAGE_DRIVER=s3`) and put Cloudflare in front for DDoS protection and edge caching.
4. Move Postgres to a managed service with point-in-time recovery. Add Redis only if
   measurements ever show the Postgres counters as a bottleneck.

## Background jobs

`jobs` table, claimed with `FOR UPDATE SKIP LOCKED`, exponential retry (30 s → 2 h),
stuck jobs recovered after 10 minutes, finished jobs pruned. Queues: `email`,
`campaign.send` (expands an audience), `campaign.deliver` (one email, paced at 8/s),
`web.revalidate`.

## Scheduled maintenance

Every 5 minutes: expired rate-limit counters, job recovery, expired auto-blocks.
Hourly: stale lockouts, expired sessions and verification tokens, unconfirmed newsletter sign-ups.
Daily: audit-log retention (400 days, through the trigger's opt-in purge path).
