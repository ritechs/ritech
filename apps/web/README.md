# RiTECHS — Website (apps/web)

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide · Framer Motion · next/image

See the repository [README](../../README.md) for setup. Everything that changes — conferences,
events, mentors, news, partners, publications, gallery and the homepage figures — is read from the
database through the API. Without the API the site still builds, but those sections are empty
(the API refreshes every page when it starts).

## Pages

All wording on the content pages is taken from the current ritechs.org (crawled 31 October – 1 November 2026).
Old URLs are kept, so links from search engines and emails keep working.

| Route | What it is |
| --- | --- |
| `/` | Homepage: hero, stats, featured research, research areas, DTISB-2027 and recent conferences, featured mentors, services, news, partner logos, newsletter |
| `/aboutus`, `/mission`, `/corevalue`, `/future-goal`, `/procedure`, `/employees` | About section |
| `/membership`, `/page-mentor`, `/page-mentee`, `/why-join`, `/benefits`, `/subscription` | Membership section |
| `/mentorship`, `/mentorship/[id]` | Mentoring directory (72 mentors, searchable via `?q=`) and profiles with biography. Ids match the old `/mentor-common-view/<id>` URLs |
| `/conference`, `/conferences/[slug]` | All 13 RiTECHS conferences; DTISB-2027 has tracks with chairs, dates, speakers, submission guide, fees, awards, sponsorship and committee |
| `/publication` | Publication overview and disciplines; `/publications` is the paper explorer (database) |
| `/event`, `/seminar`, `/botcamp`, `/research-adda`, `/cyber4me` | Events section |
| `/solutions`, `/academic-modification`, `/poster` | Solutions section |
| `/eLearning`, `/TrainingPartner` | Training section |
| `/archives`, `/gallery` | Archives |
| `/news`, `/news/[slug]` | All 5 old blog posts with full text |
| `/privacy` | Privacy notice |
| `/login` (with two-factor step), `/forgot-password`, `/reset-password`, `/register`, `/register/mentor`, `/register/mentee` | Auth and the mentor/mentee forms with the old site's fields, connected to the API |
| `/account` | Signed-in member: membership status, two-factor status, sign out |
| `/newsletter/confirm`, `/newsletter/unsubscribe` | Double opt-in links from emails |
| `/internal/revalidate` | Called by the API to refresh cached pages (secret-protected, hidden by Caddy) |
| anything else | Branded "page in preparation" screen (`app/not-found.tsx`) |

Redirects for old URLs that did change (`/blog/details/<id>`, `/mentor-common-view/<id>`, …) are in `next.config.ts`.

### Images from the old site

Photos, logos, conference posters and PDFs from the old site still load from
`https://ritechs.org/uploads/…`; the paths are stored in the database by the legacy import. If one fails,
initials or the name show instead. To copy them into this project and drop the dependency on the old
server (from the repository root):

```bash
npm run legacy:assets -w @ritechs/api -- --out ../web/public/legacy   # downloads into apps/web/public/legacy/uploads
echo "NEXT_PUBLIC_LEGACY_ASSET_BASE=/legacy" >> apps/web/.env.local
echo "LEGACY_ASSET_BASE=/legacy" >> .env                              # the API's links point there too
```

Search: header icon, `/` or `Ctrl/⌘ K` opens a publication search dialog.

## Navigation

`lib/site.ts → primaryNav` mirrors the current ritechs.org menu (Home, About, Membership, Conference,
Publication, Event, Solutions, Training, Archives) and keeps the old URLs (`/aboutus`, `/mission`,
`/botcamp`, `/eLearning`, `/TrainingPartner`, …). Every menu item now has a page. Membership uses a two-column grouped dropdown ("Join us" / "Why RiTECHS").

## Design tooling (see CLAUDE.md)

| | |
| --- | --- |
| `DESIGN.md` | RiTECHS design system in the DESIGN.md format — read before any UI change |
| `CLAUDE.md` | Rules for AI-assisted work: tokens, anti-slop, accessibility, browser QA |
| `.claude/skills/` | Impeccable, Taste Skill and Vercel Web Design Guidelines (`skills-lock.json`) |
| `.mcp.json` | Playwright MCP for real-browser checks in Claude Code |
| `npm run lint` | Overflow, overlap and touch-target checks at 5 widths (needs `npm start` running; `npx playwright install chromium` once) |
| `AUDIT.md` | Latest audit results |

## Structure

```
app/                     Routes, root layout (fonts, metadata), design tokens (globals.css)
components/
  ui/                    shadcn/ui primitives, restyled (button, dialog, sheet, input, collapsible)
  brand/logo.tsx         Supplied RiTECHS logo (next/image)
  layout/                Header (dropdowns, search dialog, mobile sheet), footer, newsletter form
  home/                  Homepage sections, one file each
  publications/          Card, explorer (filtering), abstract dialog, shared metadata parts
  events/                Event detail dialog, registration status pill
  mentors/ auth/ page/   Mentor card, auth forms and shell, inner-page header
lib/
  types.ts               All domain interfaces
  content/ data/         Fixed editorial text (about, programmes, contact, research areas, services)
  server/content.ts      Database content via the API, cached by tag
  api/                   Publications and browser-side search through the API
  site.ts                Navigation, routes, logo paths, social links
  utils.ts               Formatting helpers (dates, authors, initials)
```

## Brand

- Logo: `public/brand/ritechs-logo-white.png` is the supplied file (white, for burgundy surfaces).
  `ritechs-logo.png` is the same artwork recoloured to `#6f263d` for light surfaces. For the
  sharpest result, replace both with an SVG or a larger PNG export of the logo.
- Colours: burgundy `#6f263d`, deep burgundy `#51172d`, charcoal `#202124`, white, `#f7f6f5`,
  border `#e7e3e4` — defined once in `app/globals.css`.
- Type: Newsreader (headings, titles, abstracts) and IBM Plex Sans (interface), self-hosted.

## Where content comes from

| Content | Source |
| --- | --- |
| Conferences (all sections, fees, committees, speakers, sponsors, posters, PDFs) | Database (Admin → Conferences); imported from the old site |
| Seminars, Cyber4Me, boot camps, Research Adda sessions | Database (Admin → Events) |
| Mentors and their profiles, links and projects | Database (Admin → Members) |
| News, partners, gallery, publications | Database |
| Homepage figures | Counted live from the database (`GET /api/stats`) |
| About, membership, programme descriptions, privacy text | Fixed text copied from ritechs.org: `lib/content/organisation.ts`, `lib/content/programmes.ts` |
| Contact details, research areas, services | Fixed: `lib/data/` |
| News illustrations used when an article has no photo | `public/images` |

There is no demo or sample data. Sections with nothing in the database show an empty state or are hidden.

## To check

- The old site gives the DTISB-2027 early-bird deadline as 30 April **2026**, before the call for papers opens;
  correct it in Admin → Conferences → DTISB-2027 → Important Dates.
- Two partner logos on the old site (`uploads/1779449089.png`, `uploads/1646564044.png`) weren't linked to an organisation and are left out.
- The old site's Employees page used a placeholder phone number (`+44 (0) 1234 678910`); the real RiTECHS number is shown instead.
- No Terms of Service page existed on the old site, so the footer only links the privacy notice.
- Training Partner and Gallery had little content on the old site; add partners and albums when available.
- The old site had no publications table; add publications in the admin.

## Connection to the API

For local development no `apps/web/.env.local` is needed: the website talks to the API at
`http://127.0.0.1:4000` and takes `INTERNAL_API_TOKEN` and `REVALIDATE_SECRET` from the repository's root
`.env` (only those keys). Values in `.env.local` or the environment (Docker) take precedence.

| Where | How |
| --- | --- |
| Browser → API | Same origin: `next.config.ts` rewrites `/api/*` to `API_INTERNAL_URL`. Session cookies stay first-party. |
| Forms | `lib/auth/client.ts` (sign-in incl. 2FA, registration, reset), `lib/api/newsletter.ts`, `lib/api/client.ts` (error mapping). |
| Server Components | `lib/server/api.ts` with `INTERNAL_API_TOKEN` (exempt from per-IP limits); results cached with `cacheTag`, refreshed by `/internal/revalidate`. |
| Environment | `API_INTERNAL_URL`, `INTERNAL_API_TOKEN`, `REVALIDATE_SECRET`, optional `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. |

Security headers (CSP, HSTS, frame denial, permissions policy) are set in `next.config.ts`.
