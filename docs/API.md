# RiTECHS API reference

Base path `/api` (same origin as the website). JSON in, JSON out.
Errors: `{ "error": { "code": "VALIDATION_FAILED", "message": "…", "fields": { "email": "…" } }, "requestId": "…" }`.
Lists: `?page=1&pageSize=20&q=…` → `{ items, total, page, pageSize, pages }`.

Access: 🌐 public · 👤 signed in · ✅ approved member · ✏️ editor or admin (2FA required for admins) · 🔑 admin only (2FA required, not while impersonating).

## Authentication (Better Auth, `/api/auth/*`)
| Method | Path | |
| --- | --- | --- |
| POST | `/auth/sign-in/email` `{email,password,rememberMe}` | 🌐 → `{twoFactorRedirect:true}` when 2FA is on |
| POST | `/auth/two-factor/verify-totp` `{code,trustDevice}` · `/verify-backup-code` | 🌐 (2FA cookie) |
| POST | `/auth/sign-out` | 👤 |
| GET | `/auth/get-session` | 🌐 |
| GET | `/auth/verify-email?token=` (link in email) | 🌐 |
| POST | `/auth/send-verification-email` `{email,callbackURL}` | 🌐 |
| POST | `/auth/request-password-reset` `{email,redirectTo}` · `/auth/reset-password` `{token,newPassword}` | 🌐 |
| POST | `/auth/change-password` `{currentPassword,newPassword,revokeOtherSessions}` | 👤 |
| POST | `/auth/two-factor/enable` `{password}` → `{totpURI, backupCodes}` · `/two-factor/disable` | 👤 |
| GET/POST | `/auth/list-sessions`, `/auth/revoke-session`, `/auth/revoke-other-sessions` | 👤 |

`/auth/sign-up/email` is disabled — use `/members/register`.

## Members
| Method | Path | |
| --- | --- | --- |
| POST | `/members/register` (JSON, or multipart with `photo`) | 🌐 → 202, same answer for existing emails |
| GET | `/me` | 👤 account, profile, expertise, pending type change |
| PATCH | `/me/profile` | 👤 |
| POST | `/me/photo` (multipart `photo`, ≤ 2 MB) | 👤 |
| POST | `/me/membership-change` `{toType,reason}` | ✅ |
| GET | `/mentors?q=&country=&expertise=&featured=` · `/mentors/:slug` (a numeric slug looks up the old-site id) | 🌐 approved, visible mentors only; no contact details |
| GET | `/expertise` | 🌐 |

## Content (public, cacheable)
`GET /conferences`, `/conferences/:slug`, `/events?type=&when=upcoming|past|all`, `/events/:slug`,
`/news`, `/news/:slug`, `/pages/:slug`, `/partners`, `/publications?q=&area=&featured=`,
`/publications/:slug`, `/gallery`, `/gallery/:slug`, `/stats` (live counts for the homepage) — 🌐, drafts never returned.
Files from the old site are returned as full URLs under `LEGACY_ASSET_BASE` (`coverUrl`, `callForPapersUrl`, `photoUrl`, `logoUrl`…).

## Public forms (🌐, 202, honeypot field `website`)
`POST /events/:slug/registrations`, `/conferences/:slug/registrations`, `/contact`, `/quotes`,
`/newsletter` → confirm with `POST /newsletter/confirm {token}`; leave with `POST /newsletter/unsubscribe {token}`.

## Admin (`/api/admin/*`)
| Area | Endpoints | |
| --- | --- | --- |
| Dashboard | `GET /admin/dashboard` | ✏️ |
| Members | `GET /admin/members?type=&status=&q=` · `GET /admin/members/:userId` · `POST /:userId/review {action: approve\|reject\|suspend\|reinstate, note}` · `PATCH /:userId {featured,showInDirectory}` | ✏️ |
| | `POST /admin/members/review-bulk {userIds[≤100], action: approve\|reject, note}` → `{done, failed[]}` | ✏️ |
| | `DELETE /admin/members/:userId` | 🔑 |
| Type changes | `GET /admin/members/change-requests?status=` · `POST /admin/members/change-requests/:id/review` | ✏️ |
| Conferences | `GET/POST /admin/conferences`, `GET/PUT /admin/conferences/:id` (whole conference with all sections), `GET …/:id/registrations`, `GET …/:id/registrations.csv` | ✏️ |
| | `DELETE /admin/conferences/:id` | 🔑 |
| Events | same shape under `/admin/events`; `PATCH /admin/registrations/:id {status}` | ✏️ (delete 🔑) |
| News, publications, gallery | `GET/POST /admin/{news,publications,gallery}`, `GET/PUT/DELETE …/:id` | ✏️ |
| Pages | `GET /admin/pages`, `GET /admin/pages/:slug`, `PUT /admin/pages` (upsert by slug) | ✏️ |
| Organisations, speakers | `GET/POST`, `PUT/DELETE …/:id` | ✏️ (delete 🔑) |
| Expertise | `GET/POST /admin/expertise`, `PUT …/:id` | ✏️ |
| Media | `POST /admin/media` (multipart `file`, `purpose`, `alt`) · `GET /admin/media` | ✏️ |
| Inbox | `GET /admin/contact`, `PATCH /admin/contact/:id`, `GET /admin/quotes`, `PATCH /admin/quotes/:id`, `GET /admin/subscribers` | ✏️ |
| Mailing | `GET/POST /admin/mailing/groups`, `PUT/DELETE …/:id`, `GET/POST …/:id/members`, `DELETE …/:id/members/:memberId`; `GET/POST /admin/mailing/campaigns`, `PUT …/:id`, `POST …/:id/cancel` | ✏️ |
| | `POST /admin/mailing/campaigns/:id/send` | 🔑 |
| Security | `GET /admin/security/overview`, `GET/POST /admin/security/ip-rules`, `DELETE …/:id`, `GET /admin/security/lockouts`, `DELETE …/lockouts/:key`, `POST …/lockouts/unlock-email`, `GET /admin/security/audit?action=auth.*&actorId=&entityId=&from=&to=`, `GET /admin/security/users/:id/sessions`, `DELETE /admin/security/sessions/:id`, `POST /admin/security/users/:id/revoke-sessions` | 🔑 |
| Staff | `GET /admin/staff`, `POST /admin/staff {email,name,role}`, `PATCH /admin/staff/:userId {role}` | 🔑 |

## Health
`GET /health` (process up) · `GET /health/ready` (database reachable) — exempt from rate limits.
