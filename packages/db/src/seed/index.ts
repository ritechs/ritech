/**
 * Starting content for a new database, copied from ritechs.org: conferences
 * with the sections written up for the new site (track chairs, awards,
 * sponsorship packages), partner organisations and news.
 *
 *   npm run db:seed            # adds what is missing; never overwrites existing records
 *
 * Run it before `legacy:import`, which then fills in everything else from
 * the old site's database (members, every conference section, events…).
 * Records that already exist — imported or edited in /admin — are left alone.
 */
import { eq } from "drizzle-orm";
import { createDb, createPool, type Database } from "../client.js";
import { loadRootEnv, requireDatabaseUrl } from "../env.js";
import * as s from "../schema/index.js";

import { conferences, dtisb2027Details, type Speaker as WebSpeaker } from "./data/conferences.js";
import { news } from "./data/news.js";
import { partners } from "./data/partners.js";

const slugify = (v: string) =>
  v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paras = (ps: string[]) => ps.map((p) => `<p>${esc(p)}</p>`).join("\n");
const money = (v: string) => {
  const m = v.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
};
const mode = (f?: string): "in-person" | "online" | "hybrid" =>
  !f ? "in-person" : /hybrid|online & in person/i.test(f) ? "hybrid" : /online/i.test(f) ? "online" : "in-person";

async function upsertSpeaker(db: Database, sp: WebSpeaker) {
  const slug = slugify(sp.name);
  const [row] = await db
    .insert(s.speakers)
    .values({ slug, name: sp.name, designation: sp.role ?? null, organisation: sp.organisation ?? null })
    .onConflictDoUpdate({ target: s.speakers.slug, set: { name: sp.name, designation: sp.role ?? null, organisation: sp.organisation ?? null } })
    .returning({ id: s.speakers.id });
  return row!.id;
}

async function seedConferences(db: Database) {
  const d = dtisb2027Details;
  let added = 0;
  for (const c of conferences) {
    const isDtisb = c.slug === "DTISB-2027";
    const [exists] = await db.select({ id: s.conferences.id }).from(s.conferences).where(eq(s.conferences.slug, c.slug)).limit(1);
    if (exists) continue;
    added++;
    await db.transaction(async (tx) => {
      const values = {
        slug: c.slug,
        acronym: c.acronym,
        title: c.title,
        summary: isDtisb ? "Two days on AI, cyber resilience, digital transformation, sustainable business and SDG-driven innovation, with Springer proceedings." : null,
        objective: c.objective ?? null,
        about: isDtisb ? paras(d.intro) : null,
        joinUs: isDtisb ? paras(d.joinUs) : null,
        paperSubmission: isDtisb
          ? `${paras([d.submission.deadline])}<h3>Structure of the paper</h3><ul>${d.submission.structure.map((x: { title: string; text: string }) => `<li><strong>${esc(x.title)}</strong>: ${esc(x.text)}</li>`).join("")}</ul><h3>Requirements</h3><ul>${d.submission.rules.map((r: string) => `<li>${esc(r)}</li>`).join("")}</ul>${paras([d.submission.cmtNote])}`
          : null,
        publication: c.publication,
        location: c.location ?? null,
        mode: mode(c.format),
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
        externalUrl: c.externalUrl ?? null,
        status: "published" as const,
        featured: isDtisb,
        publishedAt: new Date(),
      };
      const [conf] = await tx.insert(s.conferences).values(values).returning({ id: s.conferences.id });
      const id = conf!.id;
      if (c.tracks.length)
        await tx.insert(s.conferenceTracks).values(
          c.tracks.map((t, i) => ({ conferenceId: id, position: i, title: t.title, description: t.description ?? null, scope: t.scope ?? null, chairs: t.chairs ?? [] })),
        );
      if (c.keyDates.length)
        await tx.insert(s.conferenceDates).values(c.keyDates.map((k, i) => ({ conferenceId: id, position: i, label: k.label, date: k.date })));
      const committee = isDtisb ? d.committee : c.generalChairs ? [{ role: "General Chairs", names: c.generalChairs }] : [];
      if (committee.length)
        await tx.insert(s.conferenceCommittee).values(committee.map((g: { role: string; names: string[] }, i: number) => ({ conferenceId: id, position: i, role: g.role, members: g.names })));
      if (isDtisb) {
        await tx.insert(s.conferenceFees).values(
          d.fees.map((f: Record<string, string>, i: number) => ({
            conferenceId: id, position: i, category: f.category!, earlyAmount: money(f.early!), regularAmount: money(f.regular!), onlineAmount: money(f.online!), currency: "USD", note: i === 0 ? d.feesNote : null,
          })),
        );
        await tx.insert(s.conferenceAwards).values(d.awards.map((a: { award: string; prize: string }, i: number) => ({ conferenceId: id, position: i, title: a.award, prize: a.prize })));
        await tx.insert(s.sponsorshipPackages).values(
          d.sponsorship.map((p: { tier: string; price: string; availability: string; highlights: string[] }, i: number) => ({
            conferenceId: id, position: i, tier: p.tier, price: money(p.price) ?? "0", currency: "USD", availability: p.availability, benefits: p.highlights,
          })),
        );
      }
      for (const [i, sp] of c.speakers.entries()) {
        const speakerId = await upsertSpeaker(tx as unknown as Database, sp);
        await tx.insert(s.conferenceSpeakers).values({ conferenceId: id, speakerId, position: i, role: "keynote" }).onConflictDoNothing();
      }
    });
  }
  return added;
}

async function seedPartners(db: Database) {
  let added = 0;
  for (const [i, p] of partners.entries()) {
    const values = { slug: slugify(p.name), name: p.name, acronym: p.monogram, website: p.href ?? null, legacyLogoPath: p.logo ?? null, isPartner: true, partnerOrder: i, active: true };
    added += (await db.insert(s.organisations).values(values).onConflictDoNothing().returning({ id: s.organisations.id })).length;
  }
  return added;
}

async function seedNews(db: Database) {
  let added = 0;
  for (const n of news) {
    const values = {
      slug: n.slug, title: n.title, category: n.category, excerpt: n.excerpt, body: paras(n.body), status: "published" as const,
      publishedAt: new Date(`${n.date}T09:00:00Z`), legacyId: Number(n.id),
    };
    added += (await db.insert(s.newsPosts).values(values).onConflictDoNothing().returning({ id: s.newsPosts.id })).length;
  }
  return added;
}

loadRootEnv();
const url = requireDatabaseUrl();
const pool = createPool({ url, max: 2, ssl: process.env.DATABASE_SSL === "true", applicationName: "ritechs-seed", statementTimeoutMs: 0 });
const db = createDb(pool);
try {
  const counts = {
    conferences: await seedConferences(db),
    partners: await seedPartners(db),
    news: await seedNews(db),
  };
  console.log("Added (existing records were kept):", counts);
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
