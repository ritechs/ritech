import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { email, line, password } from "@ritechs/shared";
import { desc, eq } from "drizzle-orm";
import type { Request } from "express";
import { z } from "zod";
import { AdminOnly, CurrentUser, NoImpersonation, Staff } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { badRequest } from "../../common/errors.js";
import { NO_STORE, listQuery, offsetOf, paged } from "../../common/http.js";
import { SingleUpload, type UploadedFileLike } from "../../common/upload.js";
import { zod } from "../../common/zod.pipe.js";
import { InjectDb } from "../../database/database.module.js";
import { MediaService, UPLOAD_LIMITS } from "../../storage/media.service.js";
import { AdminService } from "./admin.service.js";

const id = zod(z.uuid());
const userIdParam = zod(z.string().min(1).max(64));
const ipRuleInput = z.object({
  cidr: z.string().trim().min(2).max(50),
  action: z.enum(["block", "allow"]),
  reason: line(300),
  expiresInHours: z.number().int().min(1).max(24 * 365).nullable().optional(),
});
const auditQuery = listQuery.extend({
  action: z.string().max(80).regex(/^[a-z0-9_.]+\*?$/).optional(),
  actorId: z.string().max(64).optional(),
  entityId: z.string().max(100).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

@Controller("admin")
@Staff()
export class AdminDashboardController {
  constructor(
    private readonly admin: AdminService,
    private readonly media: MediaService,
    @InjectDb() private readonly db: Database,
  ) {}

  @Get("dashboard") @Header("Cache-Control", NO_STORE)
  dashboard() { return this.admin.dashboard(); }

  /** Upload an image or PDF for use in content. `purpose`: cover | logo | gallery | content | document | avatar */
  @Post("media")
  @UseInterceptors(SingleUpload("file", UPLOAD_LIMITS.documentBytes))
  upload(@UploadedFile() file: UploadedFileLike | undefined, @Body() body: Record<string, string>, @CurrentUser() u: SessionUser) {
    if (!file) throw badRequest("Choose a file to upload.", "FILE_REQUIRED");
    const purpose = z.enum(["cover", "logo", "gallery", "content", "document", "avatar"]).safeParse(body.purpose);
    if (!purpose.success) throw badRequest("Choose what the file is for.", "VALIDATION_FAILED", { purpose: "Invalid purpose." });
    return this.media.store(file, purpose.data, u.id, typeof body.alt === "string" ? body.alt : undefined);
  }

  @Get("media") @Header("Cache-Control", NO_STORE)
  async mediaList(@Query(zod(listQuery.extend({ purpose: z.enum(["cover", "logo", "gallery", "content", "document", "avatar"]).optional() }))) q: z.infer<typeof listQuery> & { purpose?: "cover" }) {
    const m = schema.media;
    const rows = await this.db.select().from(m).where(q.purpose ? eq(m.purpose, q.purpose) : undefined).orderBy(desc(m.createdAt)).limit(q.pageSize).offset(offsetOf(q));
    return paged(rows.map((r) => ({ ...r, url: this.media.url(r.storageKey) })), rows.length + offsetOf(q), q);
  }
}

/** Security console. Admins only, and never while impersonating someone. */
@Controller("admin/security")
@AdminOnly()
@NoImpersonation()
export class AdminSecurityController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview") @Header("Cache-Control", NO_STORE)
  overview() { return this.admin.securityOverview(); }

  @Get("ip-rules") @Header("Cache-Control", NO_STORE)
  rules(@Query(zod(listQuery.extend({ active: z.enum(["true", "false"]).optional().transform((v) => v === "true") }))) q: { page: number; pageSize: number; active?: boolean }) { return this.admin.ipRuleList(q); }
  @Post("ip-rules")
  addRule(@Body(zod(ipRuleInput)) b: z.infer<typeof ipRuleInput>, @CurrentUser() u: SessionUser) { return this.admin.ipRuleCreate(b, u.id); }
  @Delete("ip-rules/:id") @HttpCode(204)
  async removeRule(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.admin.ipRuleRemove(i, u.id); }

  @Get("lockouts") @Header("Cache-Control", NO_STORE)
  lockouts() { return this.admin.lockouts(); }
  @Delete("lockouts/:key") @HttpCode(204)
  async unlock(@Param("key", zod(z.string().max(80))) key: string, @CurrentUser() u: SessionUser) { await this.admin.unlock(key, u.id); }
  @Post("lockouts/unlock-email") @HttpCode(204)
  async unlockEmail(@Body(zod(z.object({ email }))) b: { email: string }, @CurrentUser() u: SessionUser) { await this.admin.unlockEmail(b.email, u.id); }

  @Get("audit") @Header("Cache-Control", NO_STORE)
  audit(@Query(zod(auditQuery)) q: z.infer<typeof auditQuery>) { return this.admin.auditLog(q); }

  @Get("users/:userId/sessions") @Header("Cache-Control", NO_STORE)
  sessions(@Param("userId", userIdParam) userId: string) { return this.admin.sessions(userId); }
  @Delete("sessions/:id") @HttpCode(204)
  async revoke(@Param("id", zod(z.string().min(1).max(64))) i: string, @CurrentUser() u: SessionUser) { await this.admin.revokeSession(i, u.id); }
  @Post("users/:userId/revoke-sessions")
  revokeAll(@Param("userId", userIdParam) userId: string, @CurrentUser() u: SessionUser) { return this.admin.revokeAllSessions(userId, u.id); }
}

@Controller("admin/staff")
@AdminOnly()
@NoImpersonation()
export class AdminStaffController {
  constructor(private readonly admin: AdminService) {}

  @Get() @Header("Cache-Control", NO_STORE)
  list() { return this.admin.staff(); }

  @Post()
  add(@Body(zod(z.object({ email, name: line(120), role: z.enum(["admin", "editor"]), password: password.optional() }))) b: { email: string; name: string; role: "admin" | "editor"; password?: string }, @CurrentUser() u: SessionUser, @Req() req: Request) {
    return this.admin.addStaff(b, u.id, req.headers);
  }

  @Patch(":userId")
  role(@Param("userId", userIdParam) userId: string, @Body(zod(z.object({ role: z.enum(["admin", "editor", "user"]) }))) b: { role: "admin" | "editor" | "user" }, @CurrentUser() u: SessionUser) {
    return this.admin.setRole(userId, b.role, u.id);
  }
}
