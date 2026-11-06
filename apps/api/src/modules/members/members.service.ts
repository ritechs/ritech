import { isUniqueViolation } from "../content/conferences.service.js";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { memberRegistrationSchema, richToPlainText, type MemberRegistration } from "@ritechs/shared";
import { fromNodeHeaders } from "better-auth/node";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { parsePhoneNumberWithError, type CountryCode } from "libphonenumber-js/min";
import { randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { AuthService } from "../../auth/auth.service.js";
import { ENV, type Env } from "../../config/env.js";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors.js";
import { likeEscape, offsetOf, paged } from "../../common/http.js";
import { RevalidateService } from "../../common/revalidate.service.js";
import { slugify } from "../../common/slug.js";
import type { UploadedFileLike } from "../../common/upload.js";
import { ZodPipe } from "../../common/zod.pipe.js";
import { InjectDb } from "../../database/database.module.js";
import { MailService } from "../../mail/mail.service.js";
import { AuditService } from "../../security/audit.service.js";
import { MediaService } from "../../storage/media.service.js";
import { WorkspaceService } from "../workspace/workspace.service.js";
import { StorageService } from "../../storage/storage.service.js";
import type { DirectoryQuery, MemberListQuery, ProfileUpdate, ReviewInput } from "./members.schemas.js";

const p = schema.memberProfiles;
const GENERIC_REGISTERED = {
  status: "verification_sent",
  message: "Thank you. If this email address can be registered, we have sent a confirmation link to it. Please check your inbox.",
};

export const toE164 = (phone: { country: string; number: string }) => parsePhoneNumberWithError(phone.number, phone.country as CountryCode).number;

@Injectable()
export class MembersService {
  private readonly log = new Logger("Members");

  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly authService: AuthService,
    private readonly media: MediaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly workspace: WorkspaceService,
  ) {}

  photoUrl(row: { photoKey?: string | null; legacyPhotoPath?: string | null }) {
    if (row.photoKey) return this.storage.publicUrl(row.photoKey);
    if (row.legacyPhotoPath) return `${this.env.LEGACY_ASSET_BASE.replace(/\/$/, "")}/${row.legacyPhotoPath.replace(/^\//, "")}`;
    return null;
  }

  /* ------------------------------ registration ------------------------------ */

  /**
   * Creates the Better Auth account and the member profile together. The
   * response is identical whether or not the email was already registered,
   * so the form cannot be used to discover who is a member.
   */
  async register(raw: unknown, photo: UploadedFileLike | undefined, headers: IncomingHttpHeaders) {
    const input: MemberRegistration = new ZodPipe(memberRegistrationSchema).transform(raw);
    const email = input.email;
    const phoneE164 = toE164(input.phone);

    const [existing] = await this.db.select({ id: schema.user.id }).from(schema.user).where(sql`lower(${schema.user.email}) = ${email}`).limit(1);
    if (existing) {
      await this.mail.queue(email, "existing-account", { url: `${this.env.WEB_URL}/forgot-password` }, { dedupeKey: `existing:${existing.id}:${new Date().toISOString().slice(0, 13)}` });
      await this.audit.record({ action: "member.register_existing_email", actorId: null, entityType: "user", entityId: existing.id });
      return GENERIC_REGISTERED;
    }

    // Validate and store the photo first, so a bad file never leaves a half-created account.
    const photoRow = photo ? await this.media.store(photo, "avatar", null, `${input.firstName} ${input.lastName}`) : null;

    let userId: string;
    try {
      const res = await this.authService.auth.api.signUpEmail({
        body: { name: `${input.firstName} ${input.lastName}`, email, password: input.password },
        headers: fromNodeHeaders(headers),
      });
      userId = res.user.id;
    } catch (err) {
      if (photoRow) await this.cleanupMedia(photoRow.id, photoRow.storageKey);
      throw err; // Better Auth errors (weak/breached password) carry a user-facing message
    }

    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(p).values({
          userId,
          type: input.type,
          status: "pending",
          slug: `${slugify(`${input.firstName}-${input.lastName}`)}-${randomBytes(3).toString("hex")}`,
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          phoneE164,
          position: input.position,
          qualification: input.qualification,
          affiliation: input.affiliation,
          country: input.country,
          bio: input.bio ?? "",
          photoId: photoRow?.id ?? null,
          privacyAcceptedAt: new Date(),
        });
        if (photoRow) await tx.update(schema.media).set({ uploadedBy: userId }).where(eq(schema.media.id, photoRow.id));
      });
    } catch (err) {
      this.log.error({ err }, "profile creation failed; rolling back account");
      await this.db.delete(schema.user).where(eq(schema.user.id, userId));
      if (photoRow) await this.cleanupMedia(photoRow.id, photoRow.storageKey);
      throw err;
    }

    await this.audit.record({ action: "member.registered", actorId: userId, entityType: "user", entityId: userId, metadata: { type: input.type } });
    await this.mail.queue(email, "registration-received", { name: input.firstName, type: input.type });
    return GENERIC_REGISTERED;
  }

  private async cleanupMedia(id: string, key: string) {
    await this.db.delete(schema.media).where(eq(schema.media.id, id));
    await this.storage.remove(key).catch(() => undefined);
  }

  /* --------------------------------- self ---------------------------------- */

  async me(userId: string) {
    const [row] = await this.db
      .select({
        user: { id: schema.user.id, name: schema.user.name, email: schema.user.email, emailVerified: schema.user.emailVerified, role: schema.user.role, twoFactorEnabled: schema.user.twoFactorEnabled, createdAt: schema.user.createdAt },
        profile: p,
        photoKey: schema.media.storageKey,
      })
      .from(schema.user)
      .leftJoin(p, eq(p.userId, schema.user.id))
      .leftJoin(schema.media, eq(schema.media.id, p.photoId))
      .where(eq(schema.user.id, userId))
      .limit(1);
    if (!row) throw notFound("Account");
    const expertise = row.profile
      ? await this.db
          .select({ id: schema.expertise.id, name: schema.expertise.name })
          .from(schema.memberExpertise)
          .innerJoin(schema.expertise, eq(schema.expertise.id, schema.memberExpertise.expertiseId))
          .where(eq(schema.memberExpertise.userId, userId))
      : [];
    const { search: _s, ...profile } = row.profile ?? ({} as Record<string, unknown>);
    const pending = row.profile
      ? await this.db.select().from(schema.membershipChangeRequests).where(and(eq(schema.membershipChangeRequests.userId, userId), eq(schema.membershipChangeRequests.status, "pending"))).limit(1)
      : [];
    return {
      // Tells the admin area whether this account must set up two-step verification before continuing.
      user: { ...row.user, twoFactorRequired: this.env.REQUIRE_STAFF_2FA && row.user.role === "admin" },
      profile: row.profile ? { ...profile, photoUrl: this.photoUrl({ photoKey: row.photoKey, legacyPhotoPath: row.profile.legacyPhotoPath }), expertise } : null,
      pendingMembershipChange: pending[0] ?? null,
    };
  }

  async updateProfile(userId: string, input: ProfileUpdate) {
    const [profile] = await this.db.select({ status: p.status, type: p.type }).from(p).where(eq(p.userId, userId)).limit(1);
    if (!profile) throw notFound("Member profile");
    if (profile.status === "suspended") throw forbidden("Your membership is suspended.", "MEMBERSHIP_SUSPENDED");
    const { phone, expertiseIds, links, ...rest } = input;
    await this.db.transaction(async (tx) => {
      const set: Partial<typeof p.$inferInsert> = { ...rest };
      if (rest.city !== undefined) set.city = rest.city || null;
      if (rest.researchField !== undefined) set.researchField = rest.researchField || null;
      if (links) {
        // Merge, so a form that edits only research links keeps the social ones; "" removes a link.
        const [cur] = await tx.select({ links: p.links }).from(p).where(eq(p.userId, userId));
        const next: Record<string, string> = { ...(cur?.links ?? {}) };
        for (const [k, v] of Object.entries(links)) {
          if (v) next[k] = v;
          else delete next[k];
        }
        set.links = next;
      }
      if (phone) set.phoneE164 = toE164(phone);
      if (Object.keys(set).length) await tx.update(p).set(set).where(eq(p.userId, userId));
      if (rest.firstName || rest.lastName) {
        const [cur] = await tx.select({ f: p.firstName, l: p.lastName }).from(p).where(eq(p.userId, userId));
        await tx.update(schema.user).set({ name: `${cur!.f} ${cur!.l}`, updatedAt: new Date() }).where(eq(schema.user.id, userId));
      }
      if (expertiseIds) {
        await tx.delete(schema.memberExpertise).where(eq(schema.memberExpertise.userId, userId));
        if (expertiseIds.length) {
          const valid = await tx.select({ id: schema.expertise.id }).from(schema.expertise).where(and(inArray(schema.expertise.id, expertiseIds), eq(schema.expertise.active, true)));
          if (valid.length) await tx.insert(schema.memberExpertise).values(valid.map((v) => ({ userId, expertiseId: v.id })));
        }
      }
    });
    await this.audit.record({ action: "member.profile_updated", entityType: "user", entityId: userId, metadata: { fields: Object.keys(input) } });
    if (profile.type === "mentor") await this.revalidate.tags("mentors");
    return this.me(userId);
  }

  async setPhoto(userId: string, file: UploadedFileLike) {
    const [profile] = await this.db.select({ photoId: p.photoId, photoKey: schema.media.storageKey }).from(p).leftJoin(schema.media, eq(schema.media.id, p.photoId)).where(eq(p.userId, userId)).limit(1);
    if (!profile) throw notFound("Member profile");
    const row = await this.media.store(file, "avatar", userId);
    await this.db.update(p).set({ photoId: row.id, legacyPhotoPath: null }).where(eq(p.userId, userId));
    if (profile.photoId && profile.photoKey) await this.cleanupMedia(profile.photoId, profile.photoKey);
    await this.revalidate.tags("mentors");
    return { photoUrl: row.url };
  }

  async requestTypeChange(userId: string, toType: "mentor" | "mentee", reason: string) {
    const [profile] = await this.db.select({ type: p.type, status: p.status }).from(p).where(eq(p.userId, userId)).limit(1);
    if (!profile) throw notFound("Member profile");
    if (profile.status !== "approved") throw forbidden("Your membership has not been approved yet.", "MEMBERSHIP_NOT_APPROVED");
    if (profile.type === toType) throw badRequest(`You are already a ${toType}.`);
    try {
      const [row] = await this.db.insert(schema.membershipChangeRequests).values({ userId, fromType: profile.type, toType, reason }).returning();
      await this.audit.record({ action: "member.type_change_requested", entityType: "membership_change", entityId: row!.id });
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("You already have a request waiting for review.");
      throw err;
    }
  }

  /* ------------------------------- directory ------------------------------- */

  private directoryBase(extra: SQL[] = []) {
    return and(eq(p.type, "mentor"), eq(p.status, "approved"), eq(p.showInDirectory, true), ...extra);
  }

  async directory(q: DirectoryQuery) {
    const where: SQL[] = [];
    if (q.q) {
      const like = `%${likeEscape(q.q)}%`;
      where.push(or(sql`${p.search} @@ plainto_tsquery('simple', ${q.q})`, ilike(p.firstName, like), ilike(p.lastName, like), ilike(p.affiliation, like))!);
    }
    if (q.country) where.push(eq(p.country, q.country));
    if (q.featured) where.push(eq(p.featured, true));
    if (q.expertise)
      where.push(
        sql`EXISTS (SELECT 1 FROM member_expertise me JOIN expertise e ON e.id = me.expertise_id WHERE me.user_id = ${p.userId} AND e.slug = ${q.expertise})`,
      );
    const cond = this.directoryBase(where);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ slug: p.slug, legacyId: p.legacyId, firstName: p.firstName, lastName: p.lastName, position: p.position, qualification: p.qualification, affiliation: p.affiliation, country: p.country, city: p.city, membershipLabel: p.membershipLabel, featured: p.featured, legacyPhotoPath: p.legacyPhotoPath, photoKey: schema.media.storageKey, userId: p.userId })
        .from(p)
        .leftJoin(schema.media, eq(schema.media.id, p.photoId))
        .where(cond)
        // Featured first, then people with a photo (the homepage strip and directory read better that way).
        .orderBy(desc(p.featured), desc(sql`(${p.photoId} IS NOT NULL OR ${p.legacyPhotoPath} IS NOT NULL)`), asc(p.lastName), asc(p.firstName))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ total: count() }).from(p).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    const expertise = await this.expertiseFor(rows.map((r) => r.userId));
    return paged(
      rows.map(({ userId, photoKey, legacyPhotoPath, ...r }) => ({ ...r, name: `${r.firstName} ${r.lastName}`, photoUrl: this.photoUrl({ photoKey, legacyPhotoPath }), expertise: expertise.get(userId) ?? [] })),
      Number(total),
      q,
    );
  }

  async mentor(slug: string) {
    const [r] = await this.db
      .select({ slug: p.slug, legacyId: p.legacyId, firstName: p.firstName, lastName: p.lastName, position: p.position, qualification: p.qualification, affiliation: p.affiliation, country: p.country, city: p.city, bio: p.bio, researchField: p.researchField, citations: p.citations, links: p.links, projects: p.projects, membershipLabel: p.membershipLabel, featured: p.featured, legacyPhotoPath: p.legacyPhotoPath, photoKey: schema.media.storageKey, userId: p.userId })
      .from(p)
      .leftJoin(schema.media, eq(schema.media.id, p.photoId))
      // Old ritechs.org profile links use the numeric account id (/mentor-common-view/14).
      .where(this.directoryBase([/^\d{1,9}$/.test(slug) ? eq(p.legacyId, Number(slug)) : eq(p.slug, slug)]))
      .limit(1);
    if (!r) throw notFound("Mentor");
    const [expertise, extras] = await Promise.all([this.expertiseFor([r.userId]), this.workspace.publicExtras(r.userId)]);
    const { userId, photoKey, legacyPhotoPath, ...rest } = r;
    return { ...rest, name: `${r.firstName} ${r.lastName}`, photoUrl: this.photoUrl({ photoKey, legacyPhotoPath }), expertise: expertise.get(userId) ?? [], ...extras };
  }

  private async expertiseFor(userIds: string[]) {
    const map = new Map<string, { name: string; slug: string }[]>();
    if (!userIds.length) return map;
    const rows = await this.db
      .select({ userId: schema.memberExpertise.userId, name: schema.expertise.name, slug: schema.expertise.slug })
      .from(schema.memberExpertise)
      .innerJoin(schema.expertise, eq(schema.expertise.id, schema.memberExpertise.expertiseId))
      .where(inArray(schema.memberExpertise.userId, userIds));
    for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), { name: r.name, slug: r.slug }]);
    return map;
  }

  /* --------------------------------- admin --------------------------------- */

  async adminList(q: MemberListQuery) {
    const where: SQL[] = [];
    if (q.type) where.push(eq(p.type, q.type));
    if (q.status) where.push(eq(p.status, q.status));
    if (q.q) {
      const like = `%${likeEscape(q.q)}%`;
      where.push(or(ilike(p.firstName, like), ilike(p.lastName, like), ilike(p.affiliation, like), ilike(schema.user.email, like))!);
    }
    const cond = where.length ? and(...where) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ userId: p.userId, slug: p.slug, type: p.type, status: p.status, name: schema.user.name, email: schema.user.email, emailVerified: schema.user.emailVerified, banned: schema.user.banned, affiliation: p.affiliation, country: p.country, featured: p.featured, createdAt: p.createdAt, reviewedAt: p.reviewedAt })
        .from(p)
        .innerJoin(schema.user, eq(schema.user.id, p.userId))
        .where(cond)
        .orderBy(desc(p.createdAt))
        .limit(q.pageSize)
        .offset(offsetOf(q)),
      this.db.select({ total: count() }).from(p).innerJoin(schema.user, eq(schema.user.id, p.userId)).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(rows, Number(total), q);
  }

  async adminGet(userId: string) {
    const me = await this.me(userId);
    const [u] = await this.db.select({ banned: schema.user.banned, banReason: schema.user.banReason, lastLoginAt: schema.user.lastLoginAt }).from(schema.user).where(eq(schema.user.id, userId));
    return { ...me, account: u };
  }

  async review(userId: string, input: ReviewInput, actorId: string) {
    const [row] = await this.db
      .select({ status: p.status, type: p.type, firstName: p.firstName, legacyId: p.legacyId, email: schema.user.email, emailVerified: schema.user.emailVerified })
      .from(p)
      .innerJoin(schema.user, eq(schema.user.id, p.userId))
      .where(eq(p.userId, userId))
      .limit(1);
    if (!row) throw notFound("Member");
    if (userId === actorId) throw forbidden("You cannot review your own membership.");
    const next = { approve: "approved", reject: "rejected", suspend: "suspended", reinstate: "approved" } as const;
    const status = next[input.action];
    // Applications imported from the old site (which never confirmed emails) may be approved directly.
    if (input.action === "approve" && !row.emailVerified && !row.legacyId) throw badRequest("This member has not confirmed their email address yet.", "EMAIL_NOT_VERIFIED");

    await this.db.transaction(async (tx) => {
      await tx.update(p).set({ status, reviewedBy: actorId, reviewedAt: new Date(), reviewNote: input.note ?? null }).where(eq(p.userId, userId));
      if (input.action === "approve" && !row.emailVerified && row.legacyId) await tx.update(schema.user).set({ emailVerified: true, updatedAt: new Date() }).where(eq(schema.user.id, userId));
      if (input.action === "suspend") {
        await tx.update(schema.user).set({ banned: true, banReason: input.note ? richToPlainText(input.note).slice(0, 500) : "Membership suspended", updatedAt: new Date() }).where(eq(schema.user.id, userId));
        await tx.delete(schema.session).where(eq(schema.session.userId, userId));
      }
      if (input.action === "reinstate") await tx.update(schema.user).set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() }).where(eq(schema.user.id, userId));
    });
    await this.audit.record({ action: `member.${input.action}`, actorId, entityType: "user", entityId: userId, metadata: { from: row.status, note: input.note } });
    if (input.action === "approve") await this.mail.queue(row.email, "member-approved", { name: row.firstName, type: row.type, url: `${this.env.WEB_URL}/login` });
    if (input.action === "reject") await this.mail.queue(row.email, "member-rejected", { name: row.firstName, note: input.note ? richToPlainText(input.note) : undefined });
    if (row.type === "mentor") await this.revalidate.tags("mentors");
    return { userId, status };
  }

  async adminUpdate(userId: string, input: { featured?: boolean; showInDirectory?: boolean }, actorId: string) {
    const [row] = await this.db.update(p).set(input).where(eq(p.userId, userId)).returning({ userId: p.userId });
    if (!row) throw notFound("Member");
    await this.audit.record({ action: "member.flags_updated", actorId, entityType: "user", entityId: userId, metadata: input });
    await this.revalidate.tags("mentors");
    return row;
  }

  async remove(userId: string, actorId: string) {
    if (userId === actorId) throw forbidden("You cannot delete your own account here.");
    const [u] = await this.db.select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, userId));
    if (!u) throw notFound("Member");
    if (u.role !== "user") throw forbidden("Staff accounts are managed under Staff.");
    await this.db.delete(schema.user).where(eq(schema.user.id, userId));
    await this.audit.record({ action: "member.deleted", actorId, entityType: "user", entityId: userId });
    await this.revalidate.tags("mentors");
  }

  async changeRequests(status: "pending" | "approved" | "rejected" | undefined, q: { page: number; pageSize: number }) {
    const r = schema.membershipChangeRequests;
    const cond = status ? eq(r.status, status) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db.select({ id: r.id, userId: r.userId, name: schema.user.name, email: schema.user.email, fromType: r.fromType, toType: r.toType, reason: r.reason, status: r.status, createdAt: r.createdAt, reviewedAt: r.reviewedAt })
        .from(r).innerJoin(schema.user, eq(schema.user.id, r.userId)).where(cond).orderBy(desc(r.createdAt)).limit(q.pageSize).offset(offsetOf(q)),
      this.db.select({ total: count() }).from(r).where(cond) as unknown as Promise<[{ total: number }]>,
    ]);
    return paged(rows, Number(total), q);
  }

  async reviewChangeRequest(id: string, action: "approve" | "reject", note: string | undefined, actorId: string) {
    const r = schema.membershipChangeRequests;
    const [req] = await this.db.select().from(r).where(and(eq(r.id, id), eq(r.status, "pending"))).limit(1);
    if (!req) throw notFound("Pending request");
    await this.db.transaction(async (tx) => {
      await tx.update(r).set({ status: action === "approve" ? "approved" : "rejected", reviewedBy: actorId, reviewedAt: new Date(), reviewNote: note ?? null }).where(eq(r.id, id));
      if (action === "approve") await tx.update(p).set({ type: req.toType }).where(eq(p.userId, req.userId));
    });
    await this.audit.record({ action: `member.type_change_${action}`, actorId, entityType: "user", entityId: req.userId, metadata: { from: req.fromType, to: req.toType } });
    await this.revalidate.tags("mentors");
    return { id, status: action === "approve" ? "approved" : "rejected" };
  }
}
