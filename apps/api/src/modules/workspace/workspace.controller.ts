import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { fundingCallSchema, memberMessageSchema, memberProjectsSchema, memberRequestSchema, mentorCourseSchema, requestResponseSchema, resourceLinkSchema, supportMessageSchema, line } from "@ritechs/shared";
import { z } from "zod";
import { CurrentUser } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { badRequest } from "../../common/errors.js";
import { NO_STORE, listQuery } from "../../common/http.js";
import { SingleUpload, type UploadedFileLike } from "../../common/upload.js";
import { zod } from "../../common/zod.pipe.js";
import { UPLOAD_LIMITS } from "../../storage/media.service.js";
import { WorkspaceService } from "./workspace.service.js";

const idParam = zod(z.uuid());
const boxQuery = listQuery.extend({ box: z.enum(["in", "out"]).default("in"), status: z.enum(["pending", "accepted", "declined", "withdrawn"]).optional() });
const scopeQuery = z.object({ scope: z.enum(["mine", "open"]).default("open") });

/** The signed-in member's own dashboard. Every route is private (session required) and scoped to that member. */
@Controller("me/workspace")
export class WorkspaceController {
  constructor(private readonly ws: WorkspaceService) {}

  @Get()
  @Header("Cache-Control", NO_STORE)
  overview(@CurrentUser() u: SessionUser) {
    return this.ws.overview(u.id);
  }

  @Put("projects")
  projects(@CurrentUser() u: SessionUser, @Body(zod(memberProjectsSchema)) body: z.infer<typeof memberProjectsSchema>) {
    return this.ws.setProjects(u.id, body.projects);
  }

  /* courses */
  @Get("courses")
  @Header("Cache-Control", NO_STORE)
  courses(@CurrentUser() u: SessionUser) {
    return this.ws.courses(u.id);
  }
  @Post("courses")
  addCourse(@CurrentUser() u: SessionUser, @Body(zod(mentorCourseSchema)) body: z.infer<typeof mentorCourseSchema>) {
    return this.ws.saveCourse(u.id, null, body);
  }
  @Put("courses/:id")
  editCourse(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string, @Body(zod(mentorCourseSchema)) body: z.infer<typeof mentorCourseSchema>) {
    return this.ws.saveCourse(u.id, id, body);
  }
  @Delete("courses/:id")
  @HttpCode(204)
  async deleteCourse(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string) {
    await this.ws.deleteCourse(u.id, id);
  }

  /* resources */
  @Get("resources")
  @Header("Cache-Control", NO_STORE)
  resources(@CurrentUser() u: SessionUser) {
    return this.ws.resources(u.id);
  }
  @Post("resources/link")
  addLink(@CurrentUser() u: SessionUser, @Body(zod(resourceLinkSchema)) body: z.infer<typeof resourceLinkSchema>) {
    return this.ws.addResourceLink(u.id, body.title, body.url);
  }
  @Post("resources/file")
  @UseInterceptors(SingleUpload("file", UPLOAD_LIMITS.documentBytes))
  addFile(@CurrentUser() u: SessionUser, @Body() body: Record<string, unknown>, @UploadedFile() file: UploadedFileLike | undefined) {
    if (!file) throw badRequest("Choose a file to upload.", "FILE_REQUIRED");
    const title = line(200).safeParse(body?.title ?? "");
    if (!title.success) throw badRequest("Give the resource a title.", "VALIDATION", { title: "Give the resource a title." });
    return this.ws.addResourceFile(u.id, title.data, file);
  }
  @Delete("resources/:id")
  @HttpCode(204)
  async deleteResource(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string) {
    await this.ws.deleteResource(u.id, id);
  }

  /* funding */
  @Get("funding")
  @Header("Cache-Control", NO_STORE)
  funding(@CurrentUser() u: SessionUser, @Query(zod(scopeQuery)) q: z.infer<typeof scopeQuery>) {
    return this.ws.funding(u.id, q.scope);
  }
  @Post("funding")
  addFunding(@CurrentUser() u: SessionUser, @Body(zod(fundingCallSchema)) body: z.infer<typeof fundingCallSchema>) {
    return this.ws.saveFunding(u.id, null, body);
  }
  @Put("funding/:id")
  editFunding(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string, @Body(zod(fundingCallSchema)) body: z.infer<typeof fundingCallSchema>) {
    return this.ws.saveFunding(u.id, id, body);
  }
  @Delete("funding/:id")
  @HttpCode(204)
  async deleteFunding(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string) {
    await this.ws.deleteFunding(u.id, id);
  }

  /* requests */
  @Get("requests")
  @Header("Cache-Control", NO_STORE)
  requests(@CurrentUser() u: SessionUser, @Query(zod(boxQuery)) q: z.infer<typeof boxQuery>) {
    return this.ws.requests(u.id, q.box, q);
  }
  @Post("requests")
  request(@CurrentUser() u: SessionUser, @Body(zod(memberRequestSchema)) body: z.infer<typeof memberRequestSchema>) {
    return this.ws.createRequest(u.id, body);
  }
  @Patch("requests/:id")
  respond(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string, @Body(zod(requestResponseSchema)) body: z.infer<typeof requestResponseSchema>) {
    return this.ws.respond(u.id, id, body);
  }

  /* people */
  @Get("connections")
  @Header("Cache-Control", NO_STORE)
  connections(@CurrentUser() u: SessionUser) {
    return this.ws.connections(u.id);
  }

  /* the RiTECHS team */
  @Get("support")
  @Header("Cache-Control", NO_STORE)
  supportHistory(@CurrentUser() u: SessionUser) {
    return this.ws.supportHistory(u.id);
  }
  @Post("support")
  support(@CurrentUser() u: SessionUser, @Body(zod(supportMessageSchema)) body: z.infer<typeof supportMessageSchema>) {
    return this.ws.sendSupport(u.id, body.subject, body.message);
  }

  /* messages */
  @Get("messages")
  @Header("Cache-Control", NO_STORE)
  messages(@CurrentUser() u: SessionUser, @Query(zod(boxQuery)) q: z.infer<typeof boxQuery>) {
    return this.ws.messages(u.id, q.box, q);
  }
  @Get("messages/recipients")
  @Header("Cache-Control", NO_STORE)
  recipients(@CurrentUser() u: SessionUser) {
    return this.ws.recipients(u.id);
  }
  @Post("messages")
  send(@CurrentUser() u: SessionUser, @Body(zod(memberMessageSchema)) body: z.infer<typeof memberMessageSchema>) {
    return this.ws.sendMessage(u.id, body);
  }
  @Post("messages/:id/read")
  @HttpCode(200)
  read(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string) {
    return this.ws.markRead(u.id, id);
  }
  @Delete("messages/:id")
  @HttpCode(204)
  async deleteMessage(@CurrentUser() u: SessionUser, @Param("id", idParam) id: string) {
    await this.ws.deleteMessage(u.id, id);
  }
}
