# RiTECHS — Security Model and Runbook

No website can honestly promise "no hacker can ever get in". What this design does
is remove the common ways in, slow down and block the automated ones, limit the
damage if one layer fails, and leave a tamper-proof trail. Each control below is
covered by an automated test in `apps/api/test/` unless marked otherwise.

## Controls

### Accounts and sign-in
| Threat | Control |
| --- | --- |
| Password guessing on one account | 5 wrong passwords in 15 min lock the account for 15 min; each further lock within 24 h doubles (30, 60 … max 24 h). The owner gets an email with a reset link. ✅ tested |
| Password spraying from one address | 10 sign-in requests/min per address (rate limit), plus 20 failures in 15 min lock the address; 3 address locks in 24 h → address blocked site-wide (1 h, 6 h, 24 h, 7 days on repeat). ✅ tested |
| Account enumeration | Unknown emails lock exactly like real ones; registration, password reset and newsletter answer identically whether or not the email exists. ✅ tested |
| Stolen password | TOTP two-step verification (authenticator app) with backup codes, optional for everyone (My Account → Security). Set `REQUIRE_STAFF_2FA=true` to make it **mandatory for admins** — the admin API then refuses an admin without it. Recommended once the site is live. ✅ tested with real TOTP codes |
| Weak / breached passwords | 10–128 characters with letters and numbers; checked against HaveIBeenPwned using k-anonymity (only 5 hash characters leave the server). |
| Bots | Honeypot fields on public forms; optional Cloudflare Turnstile on sign-in and password reset (`TURNSTILE_*`). |
| Session theft | Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` (production) and first-party. No cookie cache: bans and revocations take effect on the next request. Staff sessions last 12 hours, members 7 days. ✅ tested |
| Reset-link abuse | Single-use tokens, 30-minute expiry, max 3 reset emails per address per hour; **resetting signs out every device** and notifies the owner. ✅ tested |
| Old site passwords | Laravel bcrypt hashes are accepted once and upgraded to scrypt on that sign-in. ✅ tested |

### Requests
| Threat | Control |
| --- | --- |
| IP spoofing via headers | `X-Forwarded-For` is read only when the TCP peer is a trusted proxy, walking right-to-left. ✅ tested |
| CSRF | SameSite cookies, Origin check on every state-changing request, JSON/multipart only (no form posts). ✅ tested |
| Flooding / scraping | Per-address limits (600 reads/min, 60 writes/min, tighter per endpoint); 30 limit violations in 10 min → automatic block. In-memory pre-filter keeps floods off the database. ✅ tested |
| Oversized requests | 12 MB at Caddy, 100 KB JSON, 2 MB avatars, 5 MB images, 10 MB PDFs. ✅ tested |
| Slow-loris | 15 s header and 30 s request timeouts. |

### Data
| Threat | Control |
| --- | --- |
| SQL injection | Drizzle parameterised queries everywhere; LIKE wildcards escaped. |
| XSS | Rich text sanitised on save (allow-list, `javascript:` stripped, links get `rel=noopener`); strict CSP on the website (`frame-ancestors 'none'`, no third-party scripts) and `default-src 'none'` on the API. ✅ tested |
| Malicious uploads | File type read from the bytes; images decoded and re-encoded to WebP (strips EXIF/GPS, defeats polyglots), pixel limit against decompression bombs; files served with `nosniff` and a sandbox CSP; server-generated names. ✅ tested |
| CSV formula injection | Cells starting with `= + - @` are neutralised in exports. ✅ tested |
| Privilege escalation | Global "deny unless allowed" guard; editors cannot manage staff, security or send campaigns; admins cannot change their own role or remove the last admin; no impersonating admins. ✅ tested |
| A compromised app process | The API connects as `ritechs_app`, which cannot create, alter or drop tables or disable the audit trigger; only the migration step uses the owner role. |
| Tampering with evidence | `audit_logs` is append-only at the database level (trigger), kept 400 days. ✅ tested |
| Secrets | Validated at boot (the API refuses weak/missing values in production); never logged (pino redaction); never in images. |
| Leaking internals | Generic 500 responses with a request id; details only in logs. ✅ tested |

### Infrastructure
- Only Caddy is exposed (80/443). The API and Postgres have no published ports.
- Containers run as non-root, `no-new-privileges`, all Linux capabilities dropped, API filesystem read-only.
- CI runs typecheck, lint, the security tests, a migration drift check and `npm audit` on every change.

## Runbook

**Someone is locked out.** Admin → Security → Lockouts, or
`POST /api/admin/security/lockouts/unlock-email {"email": "…"}`. Usually better: ask them to reset their password (it also clears the lock).

**Block an address or network.** `POST /api/admin/security/ip-rules {"cidr":"203.0.113.0/24","action":"block","reason":"…","expiresInHours":24}`.
You cannot block your own address, a trusted proxy, or a range wider than /16 (IPv4).

**A university shares one IP and keeps hitting limits.** Add an `allow` rule for that address — allow rules bypass rate limits and win over blocks.

**Suspected account takeover.** Suspend the member (signs them out everywhere), then
`POST /api/admin/security/users/:id/revoke-sessions`, check `GET /api/admin/security/audit?entityId=<userId>`.

**Rotate secrets.** `BETTER_AUTH_SECRET` (signs everyone out and invalidates 2FA secrets — staff must re-enrol), `INTERNAL_API_TOKEN`, `REVALIDATE_SECRET`, database passwords. Change in `.env`, then `docker compose up -d`.

**Backups.** Nightly `docker compose exec -T postgres pg_dump -U ritechs_owner -Fc ritechs > ritechs-$(date +%F).dump`,
copied off the server (e.g. to R2/S3) and kept for 30 days. Test a restore every quarter.
Also back up the `uploads` volume unless using S3/R2.

**Updates.** Merge dependency updates after CI passes; rebuild images monthly for OS patches.

## Recommended extras (outside the code)
- Put **Cloudflare** (free plan) in front: DDoS absorption, bot management, WAF. Then set
  `CLIENT_IP_HEADER=cf-connecting-ip` and add Cloudflare's IP ranges to `TRUSTED_PROXIES`.
- Turn on Turnstile (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).
- SPF, DKIM and DMARC for the sending domain, so reset emails are trusted and not spoofed.
- An external uptime monitor on `https://ritechs.org/api/health/ready`.
- An independent penetration test before launch.

## Data imported from the old site
- Old bcrypt passwords work once and are upgraded to scrypt at that sign-in; weak old passwords are
  not forced to change, so consider asking members to reset theirs after launch.
- Members approved on the old site are imported as email-confirmed; pending applicants confirm their
  email when they first sign in, or admins can approve them directly (which confirms it).
- The old admin and "Conference" accounts were not imported. Most old pending mentor applications are
  bot sign-ups — clear them with Members → Pending → Select all → Reject Selected.
- The import file contains password hashes and personal data: keep it off the web server and delete it after use.

## Old site (ritechs.org) — act now
Seen during the review on 1 Nov 2026:
1. `APP_DEBUG` is on in production: error pages show server paths and code. Set `APP_DEBUG=false`.
2. Delete/approve/reject run from plain links (GET) — exploitable by cross-site requests while an admin is signed in.
3. Mentor and mentee registration pages return server errors.
4. Change the admin password that was shared in chat.
