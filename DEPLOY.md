# Deploying RiTECHS: Neon + Render + Vercel + Cloudflare R2

| Part | Service | Folder | Plan |
| --- | --- | --- | --- |
| Website (Next.js) | **Vercel** | `apps/web` | Hobby (free) for a demo, Pro ($20/month) once the site earns money |
| API (NestJS) | **Render** | `apps/api` (Docker) | **Free** for the demo; Starter ($7/month) later for always-on |
| Database | **Neon** (PostgreSQL) | — | Free to start (the API lets it sleep when idle) |
| Images and PDFs | **Cloudflare R2** | — | Free up to 10 GB |
| Email | **Resend** (free: 3,000 mails/month, 100/day) | — | Free. Render's free plan blocks SMTP, so mail goes over HTTPS |

One GitHub repository holds everything. Vercel builds only `apps/web`; Render builds only `apps/api`.
Put every service in **Singapore**, the closest region to Bangladesh, so pages load fast.

How it fits together: visitors open the website on Vercel. The website calls the API on
Render (both for pages and for `/api/*` requests from the browser, so sign-in cookies stay on
the website's own domain). The API reads and writes the Neon database and stores uploads in R2.

Your secrets are already in the project's `.env` (never committed). Values for Render are in
`.env.render` and for Vercel in `.env.vercel`; you paste those files into each dashboard.

**Total cost for the demo: $0.** See "Free plan: what to expect" at the end before you show it to your client.

---

## 1. Neon (database), 5 minutes

1. Sign up at **neon.com** → **New project**.
   - Name: `ritechs` · Postgres version: **the highest offered** (17 or 18) · Region: **AWS Asia Pacific (Singapore)**.
2. Click **Connect**. Turn **Connection pooling OFF** and copy the connection string
   (`postgresql://neondb_owner:…@ep-….ap-southeast-1.aws.neon.tech/neondb?sslmode=require…`).
3. Paste it in two places:
   - `.env`: `NEON_DATABASE_URL=` (used only by the copy script below)
   - `.env.render`: `DATABASE_URL=`

   The website never talks to the database, so it is not needed on Vercel. Your `.env` keeps
   `DATABASE_URL` pointing at your local database, so local development never touches the live data.

## 2. Copy your data into Neon, 2 minutes

Your local PostgreSQL must be running. In PowerShell, in this folder:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\copy-db-to-neon.ps1
```

It exports your local database (`DATABASE_URL` in `.env`), imports it into Neon in one
transaction and prints the number of users, members, news and conferences. The export file is
deleted afterwards. It refuses to run if the Neon database already has tables.

## 3. Cloudflare R2 (files), 10 minutes

Sign in to the Cloudflare account that manages **ritechs.org**.

1. **R2 Object Storage** → **Create bucket** → name `ritechs-media`, location **Asia-Pacific**.
2. Bucket → **Settings → Custom Domains → Connect Domain** → `media.ritechs.org`. Cloudflare
   adds the DNS record itself. (Avoid the `r2.dev` address: it is rate-limited and meant for testing.)
3. **R2 → Manage API tokens → Create API token** → permission **Object Read & Write**, only
   bucket `ritechs-media`. Copy the **Access Key ID**, **Secret Access Key** and the
   **S3 endpoint** (`https://<account-id>.r2.cloudflarestorage.com`).
4. Fill `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` in `.env` (for the upload
   script below) **and** `.env.render`. Local development keeps `STORAGE_DRIVER=local`, so it
   never writes to the live bucket.

### Optional: move the old site's files to R2

Photos, logos and PDFs from the old site still load from `https://ritechs.org/uploads/…`. That works
while the old server is online. To stop depending on it:

```powershell
npm ci
npm run build -w @ritechs/shared -w @ritechs/db
npm run build -w @ritechs/api
npm run legacy:assets -w @ritechs/api -- --out ../../.r2-legacy
node deploy/upload-to-r2.mjs .r2-legacy legacy
```

Then set `LEGACY_ASSET_BASE` (Render) and `NEXT_PUBLIC_LEGACY_ASSET_BASE` (Vercel) to
`https://media.ritechs.org/legacy` and redeploy both.

### Email with Resend (free), 10 minutes

1. Sign up at **resend.com** → **Domains → Add Domain** → `ritechs.org`, region closest to you.
2. Resend shows a few DNS records. Add them in **Cloudflare → ritechs.org → DNS** exactly as shown
   (they are on a `send` subdomain, so your existing email records stay as they are).
   Wait until Resend shows **Verified**.
3. **API Keys → Create API Key** (Sending access) → paste into `RESEND_API_KEY` in `.env.render`.
4. `MAIL_FROM` stays `RiTECHS <no-reply@ritechs.org>`. Replies and the cPanel mailbox are unaffected.

## 4. GitHub

Create a new **private** repository on GitHub (for example `ritechs-site`), then in this folder:

```powershell
git add -A
git commit -m "Deploy setup: Neon, Render, Vercel, Cloudflare R2"
git remote set-url origin https://github.com/<you>/ritechs-site.git
git push -u origin main
```

`.env`, `.env.render`, `.env.vercel`, SQL dumps and `.r2-legacy` are git-ignored; check with
`git status` that none of them is listed before you commit.

## 5. Render (API), 10 minutes

1. Sign up at **render.com** with GitHub → **New → Blueprint** → pick the repository.
   Render reads `render.yaml`: one Docker web service `ritechs-api`, Singapore, **Free** plan.
2. It asks for the secret values: copy them from `.env.render`.
   - `WEB_URL` is the website address from step 6, e.g. `https://ritechs-site.vercel.app`.
     Choose the Vercel project name now so you know it; you can change it later.
3. **Apply**. The first deploy builds the image and starts the API. (Your data already has all
   tables from step 2. For later database changes, run `npm run db:migrate` from your PC with
   `DATABASE_URL` set to the Neon string, because the free plan has no automatic migration step.) Open `https://ritechs-api.onrender.com/api/health`: it should show `{"status":"ok"}`.
   (Your service address may differ; copy it from the Render dashboard.)

Render's free plan sleeps after 15 minutes without visitors; see the end of this guide.

## 6. Vercel (website), 5 minutes

1. Sign up at **vercel.com** with GitHub → **Add New → Project** → import the repository.
2. **Root Directory: `apps/web`**. Leave the build settings alone (they come from `apps/web/vercel.json`).
3. **Environment Variables** → paste the contents of `.env.vercel`, after setting
   `API_INTERNAL_URL` to your Render address (e.g. `https://ritechs-api.onrender.com`).
4. **Deploy**. The build reads content from the API, so Render must be running first.
5. If the website address is not the one you put in `WEB_URL` on Render, update `WEB_URL` and
   `WEB_REVALIDATE_URL` on Render (Environment → Save, it redeploys).

## 7. Check it works

- Open the website: home page, news, conferences, a mentor's profile with photo.
- Sign in as a mentor and a mentee, upload a profile photo (it should come from `media.ritechs.org`).
- **Forgot password** with your own email: the email should arrive within a minute (check spam).
- Admin → **Security → Audit Log**: the IP column should show real visitor addresses (yours
  and your client's), not one shared address. If every row shows the same address,
  `EDGE_PROXY_SECRET` differs between Vercel and Render.

## Later: your own domain

When the client is happy, point `ritechs.org` at Vercel (Vercel → Settings → Domains), then set
`WEB_URL=https://ritechs.org` and `WEB_REVALIDATE_URL=https://ritechs.org/internal/revalidate`
on Render. Keep `media.ritechs.org` on R2. Note the old site lives on `ritechs.org` today, so move
the old files to R2 first (step 3).

## Free plan: what to expect

- **Render sleeps** after 15 minutes without visitors. The next visit waits about a minute while
  it wakes up. **Before showing the client, open `https://<your-api>.onrender.com/api/health`
  and wait for `{"status":"ok"}`**, then open the website.
- To avoid the wait, add a free monitor (for example UptimeRobot) that opens `/api/health` every
  5 minutes. Render's 750 free hours per month cover one service running all month. It does not
  wake the database, so Neon still sleeps.
- **Vercel's build reads content from the API.** If a deploy fails with a fetch error, open the
  health address above first, then press **Redeploy** in Vercel.
- **Vercel Hobby** is for non-commercial use. Fine for showing the client; move to Pro ($20/month)
  when the site is live and takes payments.
- **Neon free** has 0.5 GB of storage and sleeps when idle. Check the size of your data fits.
- **Upgrade path**: in `render.yaml` change `plan: free` to `plan: starter` ($7/month): always on,
  automatic migrations (add the `preDeployCommand` line shown in the file), and SMTP works, so you
  can go back to the cPanel mailbox by setting `SMTP_URL` and removing `RESEND_API_KEY`.

## Day to day

- `git push` deploys: Vercel rebuilds when `apps/web` or `packages/shared` changes; Render when
  `apps/api` or `packages` changes. New database migrations: run `npm run db:migrate` (see step 5).
- **Neon sleeps** after 5 minutes without queries. The first visit after a quiet period takes about
  a second longer. With `DB_SCALE_TO_ZERO=true` the API checks for background jobs only when needed
  (emails it queues are sent at once), so the free plan's compute hours last the month.
- Spending: set a usage alert in Vercel (Settings → Billing), Render and Neon.
- Backups: Neon keeps a restore window (1 day on Free, longer on paid plans). For extra safety,
  run `pg_dump` against Neon now and then and keep the file somewhere private, never in git.

## Settings reference

| Setting | Where | What |
| --- | --- | --- |
| `EDGE_PROXY_SECRET` | Render + Vercel (same value) | Lets the API trust the visitor IP the website sends, so rate limits and IP blocks work per visitor |
| `INTERNAL_API_TOKEN` | Render + Vercel (same) | The website's server-side page reads skip per-IP limits |
| `REVALIDATE_SECRET` | Render + Vercel (same) | The API tells the website to refresh pages after admin edits |
| `BETTER_AUTH_SECRET` | Render | Signs sessions and encrypts 2-step codes. Keep the same value as your local copy, because the copied data was encrypted with it |
| `RESEND_API_KEY` | Render | Sends email over HTTPS. Without it the API uses `SMTP_URL` (paid Render plans) |
| `DB_SCALE_TO_ZERO` | Render | `true` for Neon. Remove it if you move to an always-on database |
| `MEDIA_PUBLIC_URL` / `NEXT_PUBLIC_MEDIA_URL` | Render / Vercel | Public address of the R2 bucket, `https://media.ritechs.org` |
| `LEGACY_ASSET_BASE` / `NEXT_PUBLIC_LEGACY_ASSET_BASE` | Render / Vercel | Where old-site files load from |
