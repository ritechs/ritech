# RiTECHS

Website and platform for **Research, Innovation, Technology & Solution** (ritechs.org).

| Part | Stack |
| --- | --- |
| `apps/web` | Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui — the public website ([README](apps/web/README.md)) |
| `apps/api` | NestJS 12 · Better Auth · Drizzle ORM — authentication, members, conferences, events, content, admin |
| `packages/db` | PostgreSQL 16 schema and migrations (Drizzle), seed, database roles |
| `packages/shared` | Validation rules (zod) shared by the forms and the API |

**Docs:** [System design](docs/ARCHITECTURE.md) · [Security model & runbook](docs/SECURITY.md) · [API reference](docs/API.md)

## Local development

Requirements: Node 22.12+ and PostgreSQL 16+ (a local install with pgAdmin is fine; Docker is optional).

### 1. Create the database user and databases (once)

In pgAdmin, open a Query Tool on the `postgres` database as a superuser and run
(choose your own password):

```sql
CREATE ROLE ritechs LOGIN PASSWORD 'change-me';
CREATE DATABASE ritechs OWNER ritechs;        -- skip if it exists, then: ALTER DATABASE ritechs OWNER TO ritechs;
CREATE DATABASE ritechs_test OWNER ritechs;   -- used by `npm test`, wiped on every run
```

If the `ritechs` database already existed, open a Query Tool **on the ritechs database** and run
`ALTER SCHEMA public OWNER TO ritechs;` (PostgreSQL 15+ no longer lets other users create tables in `public`).

No local PostgreSQL? `npm run services:up` starts one in Docker instead (user/password `ritechs`/`ritechs`).
Don't run both: they would compete for port 5432.

### 2. Environment files

```bash
cp .env.example .env                          # Windows: copy .env.example .env
cp apps/web/.env.example apps/web/.env.local  # Windows: copy apps\web\.env.example apps\web\.env.local
```

Put your database password in `DATABASE_URL` and `TEST_DATABASE_URL`. `INTERNAL_API_TOKEN` and
`REVALIDATE_SECRET` must be the same in both files. Every line is `NAME=value`; notes start with `#`.

### 3. Install, migrate, seed, run

```bash
npm install
npm run build:packages
npm run db:migrate                  # creates the tables
npm run db:seed                     # starting conferences, partners and news (never overwrites existing records)
npm run admin:create -- --email you@ritechs.org --name "Your Name"   # asks for a password

npm run dev:api                     # http://localhost:4000/api/health/ready
npm run dev:web                     # http://localhost:3000 — admin area at /admin
```

Without SMTP, emails (verification and reset links) are printed in the API console.
To load the old site's members locally, see "Moving the old site's data" below.

## Checks

```bash
npm run typecheck && npm run lint
npm test                            # API tests against TEST_DATABASE_URL (the database is wiped)
```

CI (`.github/workflows/ci.yml`) runs these plus a migration drift check and `npm audit`.

## Database changes

1. Edit `packages/db/src/schema/*.ts`.
2. `npm run db:generate` → review the new SQL in `packages/db/migrations/` and commit it.
3. Deploys run `migrate` (as the schema owner) before the new API starts. Never at app boot.

## Production

One server (2 vCPU / 4 GB is plenty for 12k visitors a day) with Docker:

```bash
cp deploy/.env.production.example .env   # on the server; fill in every value (openssl rand -base64 48)
docker compose up -d --build             # Caddy (HTTPS) → web → api → Postgres
docker compose run --rm api node dist/cli/create-admin.js --email you@ritechs.org --name "Your Name"
docker compose run --rm api node ../../packages/db/dist/seed/index.js   # optional: initial content
```

The first admin signs in at `/admin`, can turn on two-step verification in My Account → Security (optional for everyone; set `REQUIRE_STAFF_2FA=true` to make it required for admins),
(`npm run 2fa:off -- --email you@ritechs.org` turns it off again for an account, e.g. after losing a phone),
then adds other staff under Admin → Staff. See [SECURITY.md](docs/SECURITY.md) for backups and operations.

## Moving the old site's data

The importer reads the phpMyAdmin export of the old Laravel database directly (it never executes it):

```bash
npm run legacy:import -w @ritechs/api -- --file ritechs_db.sql            # dry run: prints what would happen
npm run legacy:import -w @ritechs/api -- --file ritechs_db.sql --apply    # writes; safe to re-run
# Docker: docker compose run --rm -v $PWD/ritechs_db.sql:/tmp/db.sql:ro api node dist/cli/legacy-import.js --file /tmp/db.sql --apply
```

It brings over members with their old passwords (bcrypt, upgraded on first sign-in), profiles,
expertise, research and social links, research projects, the Advisor label, featured mentors,
pending type changes; all 13 conferences with every section (highlights, about, submission and
camera-ready instructions, tracks, important dates, local/overseas fees, committees, speakers,
sponsors, social pages, poster and PDF files); events and their sign-ups; news with photos; the
photo gallery; quote requests, mail groups, speakers and sponsors. Old profile links
(`/mentor-common-view/14`) keep working. Run `db:seed` first if you want the extra DTISB-2027
sections written for the new site (track chairs, awards, sponsorship packages); the import keeps them.

Not imported on purpose: the old admin and "Conference" logins (create staff with `admin:create`);
the old CMS pages, whose text is already on the new site's pages; and the unfinished member features
of the old site (courses, fundings, private messages, service requests, uploaded files), which hold
only developer test records.

Files (photos, logos, posters, PDFs) keep loading from the old server until you copy them with
`npm run legacy:assets -w @ritechs/api -- --out ../web/public/legacy` (see apps/web/README.md).
Delete the `.sql` file from the server afterwards — it contains password hashes and personal data.

## Admin area (`/admin`)

Staff sign in at `/login` and land on the dashboard. Two-step verification is optional for everyone
(My Account → Security); set `REQUIRE_STAFF_2FA=true` to require it for admins.

| Section | What it covers |
| --- | --- |
| Dashboard | Items needing review, key figures, applications per year, member countries, upcoming programme, latest registrations, security summary |
| Community | Members (review, bulk approve/reject, featured, suspend, type-change requests) · Inbox (messages, quotes, subscribers) · Mailing (groups, campaigns) |
| Programme | Conferences (all sections, speakers, sponsors, poster, PDFs, social links) · Events (speakers, image) · Registrations (all sign-ups, status, CSV) · Speakers · Sponsors & Partners |
| Content | News (cover photo) · Publications (with PDF) · Gallery (albums, photo upload) · Website Pages (edit the text of About, Membership, Event and other information pages, or add new pages at /pages/…) |
| Settings | Expertise topics · Form lists (reference styles, subject areas) · Staff and Security (admins only) |

Every public page reads from the API and refreshes as soon as staff save a change. Information pages keep
their designed layout until an edited version is published in Website Pages; the old site's page text is
imported there as drafts.

## Next

- Editors for partners, speakers, publications and gallery in the admin UI (the API already supports them).
- Member area: profile editing and photo upload for members (API ready: `/api/me`).
