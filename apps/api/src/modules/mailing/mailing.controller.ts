import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { email, line, paragraphText } from "@ritechs/shared";
import { z } from "zod";
import { AdminOnly, CurrentUser, Staff } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { NO_STORE, listQuery, type ListQuery } from "../../common/http.js";
import { zod } from "../../common/zod.pipe.js";
import { MailingService } from "./mailing.service.js";

const id = zod(z.uuid());
const groupInput = z.object({ name: line(120), description: paragraphText(500).nullable().optional() });
const membersInput = z.object({ people: z.array(z.object({ email, name: line(120).optional() })).min(1).max(5000) });
const campaignInput = z.object({
  subject: line(200),
  bodyHtml: z.string().min(1).max(200_000),
  audience: z
    .object({ memberTypes: z.array(z.enum(["mentor", "mentee"])).max(2).optional(), groupIds: z.array(z.uuid()).max(100).optional(), newsletter: z.boolean().optional() })
    .refine((a) => !!(a.memberTypes?.length || a.groupIds?.length || a.newsletter), "Choose at least one audience."),
});

@Controller("admin/mailing")
@Staff()
export class MailingController {
  constructor(private readonly mailing: MailingService) {}

  @Get("groups") @Header("Cache-Control", NO_STORE)
  groups() { return this.mailing.groups(); }
  @Post("groups")
  createGroup(@Body(zod(groupInput)) b: z.infer<typeof groupInput>, @CurrentUser() u: SessionUser) { return this.mailing.saveGroup(b, u.id); }
  @Put("groups/:id")
  updateGroup(@Param("id", id) i: string, @Body(zod(groupInput)) b: z.infer<typeof groupInput>, @CurrentUser() u: SessionUser) { return this.mailing.saveGroup(b, u.id, i); }
  @Delete("groups/:id") @HttpCode(204)
  async deleteGroup(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.mailing.removeGroup(i, u.id); }
  @Get("groups/:id/members") @Header("Cache-Control", NO_STORE)
  members(@Param("id", id) i: string, @Query(zod(listQuery)) q: ListQuery) { return this.mailing.groupMembers(i, q); }
  @Post("groups/:id/members")
  addMembers(@Param("id", id) i: string, @Body(zod(membersInput)) b: z.infer<typeof membersInput>, @CurrentUser() u: SessionUser) { return this.mailing.addMembers(i, b.people, u.id); }
  @Delete("groups/:id/members/:memberId") @HttpCode(204)
  async removeMember(@Param("id", id) i: string, @Param("memberId", id) m: string, @CurrentUser() u: SessionUser) { await this.mailing.removeMember(i, m, u.id); }

  @Get("campaigns") @Header("Cache-Control", NO_STORE)
  campaigns(@Query(zod(listQuery)) q: ListQuery) { return this.mailing.campaigns(q); }
  @Post("campaigns")
  createCampaign(@Body(zod(campaignInput)) b: z.infer<typeof campaignInput>, @CurrentUser() u: SessionUser) { return this.mailing.saveCampaign(b, u.id); }
  @Put("campaigns/:id")
  updateCampaign(@Param("id", id) i: string, @Body(zod(campaignInput)) b: z.infer<typeof campaignInput>, @CurrentUser() u: SessionUser) { return this.mailing.saveCampaign(b, u.id, i); }
  /** Sending mass email is admin-only. */
  @Post("campaigns/:id/send") @AdminOnly()
  send(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { return this.mailing.send(i, u.id); }
  @Post("campaigns/:id/cancel")
  cancel(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { return this.mailing.cancel(i, u.id); }
}
