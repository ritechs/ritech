import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import type { Request } from "express";
import { AdminOnly, ApprovedMember, CurrentUser, NoImpersonation, Public, Staff } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { badRequest } from "../../common/errors.js";
import { NO_STORE, PUBLIC_CACHE, slugParam } from "../../common/http.js";
import { SingleUpload, type UploadedFileLike } from "../../common/upload.js";
import { zod } from "../../common/zod.pipe.js";
import { UPLOAD_LIMITS } from "../../storage/media.service.js";
import { MembersService } from "./members.service.js";
import {
  bulkReviewSchema,
  changeListQuery,
  changeReviewSchema,
  directoryQuery,
  memberFlagsSchema,
  memberListQuery,
  membershipChangeSchema,
  profileUpdateSchema,
  registrationFromForm,
  reviewSchema,
  type DirectoryQuery,
  type MemberListQuery,
  type ProfileUpdate,
  type ReviewInput,
} from "./members.schemas.js";
import { z } from "zod";

@Controller("members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  /** Mentor or mentee registration (JSON, or multipart with an optional `photo`). */
  @Post("register")
  @Public()
  @HttpCode(202)
  @UseInterceptors(SingleUpload("photo", UPLOAD_LIMITS.avatarBytes))
  register(@Body() body: Record<string, unknown>, @UploadedFile() photo: UploadedFileLike | undefined, @Req() req: Request) {
    return this.members.register(registrationFromForm(body ?? {}), photo, req.headers);
  }
}

@Controller("me")
export class MeController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Header("Cache-Control", NO_STORE)
  me(@CurrentUser() user: SessionUser) {
    return this.members.me(user.id);
  }

  @Patch("profile")
  update(@CurrentUser() user: SessionUser, @Body(zod(profileUpdateSchema)) body: ProfileUpdate) {
    return this.members.updateProfile(user.id, body);
  }

  @Post("photo")
  @UseInterceptors(SingleUpload("photo", UPLOAD_LIMITS.avatarBytes))
  photo(@CurrentUser() user: SessionUser, @UploadedFile() file: UploadedFileLike | undefined) {
    if (!file) throw badRequest("Choose a photo to upload.", "FILE_REQUIRED");
    return this.members.setPhoto(user.id, file);
  }

  @Post("membership-change")
  @ApprovedMember()
  changeType(@CurrentUser() user: SessionUser, @Body(zod(membershipChangeSchema)) body: z.infer<typeof membershipChangeSchema>) {
    return this.members.requestTypeChange(user.id, body.toType, body.reason);
  }
}

@Controller("mentors")
@Public()
export class DirectoryController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Header("Cache-Control", PUBLIC_CACHE)
  list(@Query(zod(directoryQuery)) q: DirectoryQuery) {
    return this.members.directory(q);
  }

  @Get(":slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  get(@Param("slug", zod(slugParam)) slug: string) {
    return this.members.mentor(slug);
  }
}

@Controller("admin/members")
@Staff()
export class AdminMembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Header("Cache-Control", NO_STORE)
  list(@Query(zod(memberListQuery)) q: MemberListQuery) {
    return this.members.adminList(q);
  }

  @Get("change-requests")
  @Header("Cache-Control", NO_STORE)
  changes(@Query(zod(changeListQuery)) q: z.infer<typeof changeListQuery>) {
    return this.members.changeRequests(q.status, q);
  }

  @Post("change-requests/:id/review")
  reviewChange(@Param("id", zod(z.uuid())) id: string, @Body(zod(changeReviewSchema)) body: z.infer<typeof changeReviewSchema>, @CurrentUser() user: SessionUser) {
    return this.members.reviewChangeRequest(id, body.action, body.note, user.id);
  }

  /** Approve or reject up to 100 applications at once (e.g. clearing spam sign-ups). */
  @Post("review-bulk")
  async reviewBulk(@Body(zod(bulkReviewSchema)) body: z.infer<typeof bulkReviewSchema>, @CurrentUser() user: SessionUser) {
    const results = await Promise.allSettled(body.userIds.map((id) => this.members.review(id, { action: body.action, ...(body.note ? { note: body.note } : {}) }, user.id)));
    const failed = results.flatMap((r, i) => (r.status === "rejected" ? [{ userId: body.userIds[i], message: (r.reason as { response?: { error?: { message?: string } } })?.response?.error?.message ?? "Failed" }] : []));
    return { done: results.length - failed.length, failed };
  }

  @Get(":userId")
  @Header("Cache-Control", NO_STORE)
  get(@Param("userId", zod(z.string().min(1).max(64))) userId: string) {
    return this.members.adminGet(userId);
  }

  @Post(":userId/review")
  review(@Param("userId", zod(z.string().min(1).max(64))) userId: string, @Body(zod(reviewSchema)) body: ReviewInput, @CurrentUser() user: SessionUser) {
    return this.members.review(userId, body, user.id);
  }

  @Patch(":userId")
  flags(@Param("userId", zod(z.string().min(1).max(64))) userId: string, @Body(zod(memberFlagsSchema)) body: z.infer<typeof memberFlagsSchema>, @CurrentUser() user: SessionUser) {
    return this.members.adminUpdate(userId, body, user.id);
  }

  @Delete(":userId")
  @AdminOnly()
  @NoImpersonation()
  @HttpCode(204)
  async remove(@Param("userId", zod(z.string().min(1).max(64))) userId: string, @CurrentUser() user: SessionUser) {
    await this.members.remove(userId, user.id);
  }
}

