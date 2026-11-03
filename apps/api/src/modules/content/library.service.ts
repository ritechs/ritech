/**
 * News, pages, partner organisations, speakers, publications, expertise
 * topics and gallery albums: simpler content with list / get / save / delete.
 */
import { Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { conflict, notFound } from "../../common/errors.js";
import { likeEscape, offsetOf, paged, type ListQuery } from "../../common/http.js";
import { RevalidateService } from "../../common/revalidate.service.js";
import { sanitizeRichText } from "../../common/sanitize.js";
import { slugify } from "../../common/slug.js";
import { InjectDb } from "../../database/database.module.js";
import { AuditService } from "../../security/audit.service.js";
import { StorageService } from "../../storage/storage.service.js";
import { isUniqueViolation } from "./conferences.service.js";
import type { AlbumInput, LookupInput, NewsInput, OrganisationInput, PageInput, PublicationInput, SpeakerInput } from "./content.schemas.js";

const total = (p: Promise<unknown>) => p as Promise<[{ total: number }]>;
const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

@Injectable()
export class LibraryService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {}

  private url = (key?: string | null, legacyPath?: string | null) => this.storage.urlOf(key, legacyPath);

  private async guard<T>(fn: () => Promise<T>, what: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict(`Another ${what} already uses this slug or name.`, "DUPLICATE");
      throw err;
    }
  }

  /* --------------------------------- news ---------------------------------- */

  async newsList(q: ListQuery & { status?: string; category?: string }, publicOnly: boolean) {
    const n = schema.newsPosts;
    const where: SQL[] = [];
    if (publicOnly) where.push(eq(n.status, "published"), sql`${n.publishedAt} <= now()`);
    else if (q.status) where.push(eq(n.status, q.status as "draft"));
    if (q.q) where.push(ilike(n.title, `%${likeEscape(q.q)}%`));
    const cond = where.length ? and(...where) : undefined;
    const [items, [t]] = await Promise.all([
      this.db
        .select({ id: n.id, slug: n.slug, title: n.title, category: n.category, excerpt: n.excerpt, status: n.status, publishedAt: n.publishedAt, coverKey: schema.media.storageKey, legacyCoverPath: n.legacyCoverPath })
        .from(n)
        .leftJoin(schema.media, eq(schema.media.id, n.coverId))
        .where(cond)
        .orderBy(sql`${n.publishedAt} DESC NULLS FIRST`)
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      total(this.db.select({ total: count() }).from(n).where(cond)),
    ]);
    return paged(items.map(({ coverKey, legacyCoverPath, ...i }) => ({ ...i, coverUrl: this.url(coverKey, legacyCoverPath) })), Number(t.total), q);
  }

  async newsGet(slugOrId: string, publicOnly: boolean) {
    const n = schema.newsPosts;
    const [row] = await this.db
      .select({ post: n, coverKey: schema.media.storageKey })
      .from(n)
      .leftJoin(schema.media, eq(schema.media.id, n.coverId))
      .where(and(isId(slugOrId) ? eq(n.id, slugOrId) : eq(n.slug, slugOrId), publicOnly ? and(eq(n.status, "published"), sql`${n.publishedAt} <= now()`) : undefined))
      .limit(1);
    if (!row) throw notFound("Article");
    const { authorId: _a, legacyId: _l, legacyCoverPath, ...post } = row.post;
    return { ...post, coverUrl: this.url(row.coverKey, legacyCoverPath) };
  }

  async newsSave(input: NewsInput, actorId: string, id?: string) {
    const n = schema.newsPosts;
    const values = {
      ...input,
      body: sanitizeRichText(input.body),
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : input.status === "published" ? new Date() : null,
    };
    const saved = await this.guard(async () => {
      if (id) {
        const [row] = await this.db.update(n).set(values).where(eq(n.id, id)).returning({ id: n.id });
        if (!row) throw notFound("Article");
        return row.id;
      }
      const [row] = await this.db.insert(n).values({ ...values, authorId: actorId }).returning({ id: n.id });
      return row!.id;
    }, "article");
    await this.audit.record({ action: id ? "news.updated" : "news.created", actorId, entityType: "news", entityId: saved, metadata: { slug: input.slug, status: input.status } });
    await this.revalidate.tags("news", `news:${input.slug}`);
    return this.newsGet(saved, false);
  }

  async newsRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.newsPosts).where(eq(schema.newsPosts.id, id)).returning({ slug: schema.newsPosts.slug });
    if (!row) throw notFound("Article");
    await this.audit.record({ action: "news.deleted", actorId, entityType: "news", entityId: id });
    await this.revalidate.tags("news", `news:${row.slug}`);
  }

  /* --------------------------------- pages --------------------------------- */

  async pageGet(slug: string, publicOnly: boolean) {
    const [row] = await this.db.select().from(schema.pages).where(and(eq(schema.pages.slug, slug), publicOnly ? eq(schema.pages.status, "published") : undefined)).limit(1);
    if (!row) throw notFound("Page");
    return row;
  }

  async pageList(publicOnly = false) {
    const pg = schema.pages;
    return this.db
      .select({ id: pg.id, slug: pg.slug, title: pg.title, status: pg.status, legacyId: pg.legacyId, updatedAt: pg.updatedAt })
      .from(pg)
      .where(publicOnly ? eq(pg.status, "published") : undefined)
      .orderBy(asc(pg.slug));
  }

  /** Deletes a page. For a page built into the website this brings back its designed version. */
  async pageRemove(slug: string, actorId: string) {
    const [row] = await this.db.delete(schema.pages).where(eq(schema.pages.slug, slug)).returning({ id: schema.pages.id });
    if (!row) throw notFound("Page");
    await this.audit.record({ action: "page.deleted", actorId, entityType: "page", entityId: row.id, metadata: { slug } });
    await this.revalidate.tags("pages", `page:${slug}`);
  }

  async pageSave(input: PageInput, actorId: string) {
    const values = { ...input, body: sanitizeRichText(input.body), updatedBy: actorId };
    const [row] = await this.db.insert(schema.pages).values(values).onConflictDoUpdate({ target: schema.pages.slug, set: values }).returning();
    await this.audit.record({ action: "page.saved", actorId, entityType: "page", entityId: row!.id, metadata: { slug: input.slug } });
    await this.revalidate.tags("pages", `page:${input.slug}`);
    return row!;
  }

  /* ---------------------------- organisations ------------------------------ */

  async partners() {
    const o = schema.organisations;
    const rows = await this.db
      .select({ id: o.id, name: o.name, acronym: o.acronym, website: o.website, legacyLogoPath: o.legacyLogoPath, logoKey: schema.media.storageKey })
      .from(o)
      .leftJoin(schema.media, eq(schema.media.id, o.logoId))
      .where(and(eq(o.isPartner, true), eq(o.active, true)))
      .orderBy(asc(o.partnerOrder), asc(o.name));
    return rows.map(({ logoKey, ...r }) => ({ ...r, logoUrl: this.url(logoKey) }));
  }

  async organisationList(q: ListQuery) {
    const o = schema.organisations;
    const cond = q.q ? or(ilike(o.name, `%${likeEscape(q.q)}%`), ilike(o.acronym, `%${likeEscape(q.q)}%`)) : undefined;
    const [items, [t]] = await Promise.all([
      this.db
        .select({
          org: o,
          logoKey: schema.media.storageKey,
          conferences: sql<number>`(SELECT count(*)::int FROM conference_sponsors cs WHERE cs.organisation_id = ${o.id})`,
        })
        .from(o)
        .leftJoin(schema.media, eq(schema.media.id, o.logoId))
        .where(cond)
        .orderBy(asc(o.name))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      total(this.db.select({ total: count() }).from(o).where(cond)),
    ]);
    return paged(items.map(({ org, logoKey, conferences }) => ({ ...org, conferences, logoUrl: this.url(logoKey, org.legacyLogoPath) })), Number(t.total), q);
  }

  async organisationSave(input: OrganisationInput, actorId: string, id?: string) {
    const o = schema.organisations;
    const values = { ...input, slug: input.slug ?? slugify(input.name) };
    const row = await this.guard(async () => {
      if (id) {
        const [r] = await this.db.update(o).set(values).where(eq(o.id, id)).returning();
        if (!r) throw notFound("Organisation");
        return r;
      }
      const [r] = await this.db.insert(o).values(values).returning();
      return r!;
    }, "organisation");
    await this.audit.record({ action: id ? "organisation.updated" : "organisation.created", actorId, entityType: "organisation", entityId: row.id });
    await this.revalidate.tags("partners", "conferences");
    return row;
  }

  async organisationRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.organisations).where(eq(schema.organisations.id, id)).returning({ id: schema.organisations.id });
    if (!row) throw notFound("Organisation");
    await this.audit.record({ action: "organisation.deleted", actorId, entityType: "organisation", entityId: id });
    await this.revalidate.tags("partners", "conferences");
  }

  /* -------------------------------- speakers ------------------------------- */

  async speakerList(q: ListQuery) {
    const s = schema.speakers;
    const cond = q.q ? or(ilike(s.name, `%${likeEscape(q.q)}%`), ilike(s.organisation, `%${likeEscape(q.q)}%`)) : undefined;
    const [items, [t]] = await Promise.all([
      this.db
        .select({
          speaker: s,
          photoKey: schema.media.storageKey,
          conferences: sql<number>`(SELECT count(*)::int FROM conference_speakers cs WHERE cs.speaker_id = ${s.id})`,
        })
        .from(s)
        .leftJoin(schema.media, eq(schema.media.id, s.photoId))
        .where(cond)
        .orderBy(asc(s.name))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      total(this.db.select({ total: count() }).from(s).where(cond)),
    ]);
    return paged(items.map(({ speaker, photoKey, conferences }) => ({ ...speaker, conferences, photoUrl: this.url(photoKey, speaker.legacyPhotoPath) })), Number(t.total), q);
  }

  async speakerSave(input: SpeakerInput, actorId: string, id?: string) {
    const s = schema.speakers;
    const values = { ...input, slug: input.slug ?? `${slugify(input.name)}-${randomBytes(2).toString("hex")}` };
    const row = await this.guard(async () => {
      if (id) {
        const [r] = await this.db.update(s).set(values).where(eq(s.id, id)).returning();
        if (!r) throw notFound("Speaker");
        return r;
      }
      const [r] = await this.db.insert(s).values(values).returning();
      return r!;
    }, "speaker");
    await this.audit.record({ action: id ? "speaker.updated" : "speaker.created", actorId, entityType: "speaker", entityId: row.id });
    await this.revalidate.tags("conferences", "events");
    return row;
  }

  async speakerRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.speakers).where(eq(schema.speakers.id, id)).returning({ id: schema.speakers.id });
    if (!row) throw notFound("Speaker");
    await this.audit.record({ action: "speaker.deleted", actorId, entityType: "speaker", entityId: id });
    await this.revalidate.tags("conferences", "events");
  }

  /* ------------------------------ publications ----------------------------- */

  async publicationList(q: ListQuery & { area?: string; featured?: boolean; status?: string }, publicOnly: boolean) {
    const p = schema.publications;
    const where: SQL[] = [];
    if (publicOnly) where.push(eq(p.status, "published"));
    else if (q.status) where.push(eq(p.status, q.status as "draft"));
    if (q.area) where.push(eq(p.area, q.area));
    if (q.featured) where.push(eq(p.featured, true));
    if (q.q) where.push(or(sql`${p.search} @@ websearch_to_tsquery('english', ${q.q})`, ilike(p.title, `%${likeEscape(q.q)}%`))!);
    const cond = where.length ? and(...where) : undefined;
    const rank = q.q ? sql`ts_rank(${p.search}, websearch_to_tsquery('english', ${q.q}))` : null;
    const [items, [t]] = await Promise.all([
      this.db
        .select({ id: p.id, slug: p.slug, title: p.title, authors: p.authors, area: p.area, type: p.type, venue: p.venue, volume: p.volume, doi: p.doi, keywords: p.keywords, publishedOn: p.publishedOn, featured: p.featured, isDemo: p.isDemo, status: p.status })
        .from(p)
        .where(cond)
        .orderBy(...(rank ? [desc(rank)] : []), desc(p.publishedOn))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      total(this.db.select({ total: count() }).from(p).where(cond)),
    ]);
    return paged(items, Number(t.total), q);
  }

  async publicationGet(slugOrId: string, publicOnly: boolean) {
    const p = schema.publications;
    const [row] = await this.db
      .select({ pub: p, pdfKey: schema.media.storageKey })
      .from(p)
      .leftJoin(schema.media, eq(schema.media.id, p.pdfId))
      .where(and(isId(slugOrId) ? eq(p.id, slugOrId) : eq(p.slug, slugOrId), publicOnly ? eq(p.status, "published") : undefined))
      .limit(1);
    if (!row) throw notFound("Publication");
    const { search: _s, createdBy: _c, ...pub } = row.pub;
    return { ...pub, pdfUrl: this.url(row.pdfKey) };
  }

  async publicationSave(input: PublicationInput, actorId: string, id?: string) {
    const p = schema.publications;
    const saved = await this.guard(async () => {
      if (id) {
        const [r] = await this.db.update(p).set({ ...input, isDemo: false }).where(eq(p.id, id)).returning({ id: p.id });
        if (!r) throw notFound("Publication");
        return r.id;
      }
      const [r] = await this.db.insert(p).values({ ...input, createdBy: actorId }).returning({ id: p.id });
      return r!.id;
    }, "publication");
    await this.audit.record({ action: id ? "publication.updated" : "publication.created", actorId, entityType: "publication", entityId: saved });
    await this.revalidate.tags("publications", `publication:${input.slug}`);
    return this.publicationGet(saved, false);
  }

  async publicationRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.publications).where(eq(schema.publications.id, id)).returning({ slug: schema.publications.slug });
    if (!row) throw notFound("Publication");
    await this.audit.record({ action: "publication.deleted", actorId, entityType: "publication", entityId: id });
    await this.revalidate.tags("publications", `publication:${row.slug}`);
  }

  /* -------------------------------- expertise ------------------------------ */

  async expertiseList(activeOnly: boolean) {
    const x = schema.expertise;
    if (activeOnly) return this.db.select({ id: x.id, name: x.name, slug: x.slug, active: x.active }).from(x).where(eq(x.active, true)).orderBy(asc(x.name));
    return this.db
      .select({ id: x.id, name: x.name, slug: x.slug, active: x.active, members: sql<number>`(SELECT count(*)::int FROM member_expertise me WHERE me.expertise_id = ${x.id})` })
      .from(x)
      .orderBy(asc(x.name));
  }

  async expertiseRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.expertise).where(eq(schema.expertise.id, id)).returning({ name: schema.expertise.name });
    if (!row) throw notFound("Expertise");
    await this.audit.record({ action: "expertise.deleted", actorId, entityType: "expertise", entityId: id, metadata: { name: row.name } });
    await this.revalidate.tags("mentors");
  }

  /* ------------------------ form options (lookups) ------------------------ */

  async lookupList(kind: "reference_style" | "required_area" | undefined, activeOnly: boolean) {
    const l = schema.lookupOptions;
    const where = and(kind ? eq(l.kind, kind) : undefined, activeOnly ? eq(l.active, true) : undefined);
    return this.db.select({ id: l.id, kind: l.kind, name: l.name, position: l.position, active: l.active }).from(l).where(where).orderBy(asc(l.kind), asc(l.position), asc(l.name));
  }

  async lookupSave(input: LookupInput, actorId: string, id?: string) {
    const l = schema.lookupOptions;
    const row = await this.guard(async () => {
      if (id) {
        const [r] = await this.db.update(l).set(input).where(eq(l.id, id)).returning();
        if (!r) throw notFound("Option");
        return r;
      }
      const [r] = await this.db.insert(l).values(input).returning();
      return r!;
    }, "option");
    await this.audit.record({ action: id ? "lookup.updated" : "lookup.created", actorId, entityType: "lookup", entityId: row.id, metadata: { kind: row.kind, name: row.name } });
    return row;
  }

  async lookupRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.lookupOptions).where(eq(schema.lookupOptions.id, id)).returning({ name: schema.lookupOptions.name });
    if (!row) throw notFound("Option");
    await this.audit.record({ action: "lookup.deleted", actorId, entityType: "lookup", entityId: id, metadata: { name: row.name } });
  }

  async expertiseSave(input: { name: string; active: boolean }, actorId: string, id?: string) {
    const x = schema.expertise;
    const values = { ...input, slug: slugify(input.name) };
    const row = await this.guard(async () => {
      if (id) {
        const [r] = await this.db.update(x).set(values).where(eq(x.id, id)).returning();
        if (!r) throw notFound("Expertise");
        return r;
      }
      const [r] = await this.db.insert(x).values(values).returning();
      return r!;
    }, "expertise topic");
    await this.audit.record({ action: id ? "expertise.updated" : "expertise.created", actorId, entityType: "expertise", entityId: row.id });
    return row;
  }

  /* --------------------------------- gallery ------------------------------- */

  async albums(publicOnly: boolean) {
    const a = schema.galleryAlbums;
    const rows = await this.db.query.galleryAlbums.findMany({
      where: publicOnly ? eq(a.status, "published") : undefined,
      orderBy: (t, { desc: d }) => [d(t.takenOn), d(t.createdAt)],
      with: { items: { with: { media: true }, orderBy: (t, { asc: x }) => [x(t.position)], limit: 1 } },
    });
    const counts = new Map(
      (await this.db.select({ albumId: schema.galleryItems.albumId, n: count() }).from(schema.galleryItems).groupBy(schema.galleryItems.albumId)).map((r) => [r.albumId, Number(r.n)]),
    );
    return rows.map(({ items, ...al }) => ({ ...al, photos: counts.get(al.id) ?? 0, coverUrl: this.url(items[0]?.media?.storageKey, items[0]?.legacyPath) }));
  }

  async album(slugOrId: string, publicOnly: boolean) {
    const a = schema.galleryAlbums;
    const row = await this.db.query.galleryAlbums.findFirst({
      where: and(isId(slugOrId) ? eq(a.id, slugOrId) : eq(a.slug, slugOrId), publicOnly ? eq(a.status, "published") : undefined),
      with: { items: { with: { media: true }, orderBy: (t, { asc: x }) => [x(t.position)] } },
    });
    if (!row) throw notFound("Album");
    return { ...row, items: row.items.map((i) => ({ id: i.id, mediaId: i.mediaId, legacyPath: i.legacyPath, caption: i.caption, url: this.url(i.media?.storageKey, i.legacyPath), width: i.media?.width ?? null, height: i.media?.height ?? null, alt: i.media?.alt ?? i.caption ?? row.title })) };
  }

  async albumSave(input: AlbumInput, actorId: string, id?: string) {
    const a = schema.galleryAlbums;
    const { items, ...fields } = input;
    const albumId = await this.guard(
      () =>
        this.db.transaction(async (tx) => {
          let aid = id;
          if (id) {
            const [r] = await tx.update(a).set(fields).where(eq(a.id, id)).returning({ id: a.id });
            if (!r) throw notFound("Album");
            await tx.delete(schema.galleryItems).where(eq(schema.galleryItems.albumId, id));
          } else {
            const [r] = await tx.insert(a).values(fields).returning({ id: a.id });
            aid = r!.id;
          }
          if (items.length) await tx.insert(schema.galleryItems).values(items.map((it, i) => ({ albumId: aid!, mediaId: it.mediaId ?? null, legacyPath: it.legacyPath ?? null, caption: it.caption ?? null, position: i })));
          return aid!;
        }),
      "album",
    );
    await this.audit.record({ action: id ? "gallery.updated" : "gallery.created", actorId, entityType: "gallery", entityId: albumId });
    await this.revalidate.tags("gallery");
    return this.album(albumId, false);
  }

  async albumRemove(id: string, actorId: string) {
    const [row] = await this.db.delete(schema.galleryAlbums).where(eq(schema.galleryAlbums.id, id)).returning({ id: schema.galleryAlbums.id });
    if (!row) throw notFound("Album");
    await this.audit.record({ action: "gallery.deleted", actorId, entityType: "gallery", entityId: id });
    await this.revalidate.tags("gallery");
  }
}
