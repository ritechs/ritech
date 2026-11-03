import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { contactSchema, newsletterSchema, quoteRequestSchema } from "@ritechs/shared";
import { z } from "zod";
import { CurrentUser, Public, Staff } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { NO_STORE, listQuery } from "../../common/http.js";
import { zod } from "../../common/zod.pipe.js";
import { InboxService } from "./inbox.service.js";

const tokenBody = z.object({ token: z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/) });

@Controller()
@Public()
export class PublicInboxController {
  constructor(private readonly inbox: InboxService) {}

  @Post("contact") @HttpCode(202)
  contact(@Body(zod(contactSchema)) b: z.infer<typeof contactSchema>) { return this.inbox.contact(b); }

  @Post("quotes") @HttpCode(202)
  quote(@Body(zod(quoteRequestSchema)) b: z.infer<typeof quoteRequestSchema>) { return this.inbox.quote(b); }

  @Post("newsletter") @HttpCode(202)
  subscribe(@Body(zod(newsletterSchema)) b: z.infer<typeof newsletterSchema>) { return this.inbox.subscribe(b.email, b.website); }

  @Post("newsletter/confirm") @HttpCode(200)
  confirm(@Body(zod(tokenBody)) b: z.infer<typeof tokenBody>) { return this.inbox.confirm(b.token); }

  @Post("newsletter/unsubscribe") @HttpCode(200)
  unsubscribe(@Body(zod(tokenBody)) b: z.infer<typeof tokenBody>) { return this.inbox.unsubscribe(b.token); }
}

const statusQuery = (values: [string, ...string[]]) => listQuery.extend({ status: z.enum(values).optional() });

@Controller("admin")
@Staff()
export class AdminInboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get("contact") @Header("Cache-Control", NO_STORE)
  contact(@Query(zod(statusQuery(["new", "read", "archived"]))) q: { page: number; pageSize: number; status?: string }) { return this.inbox.list("contact", q); }

  @Patch("contact/:id")
  contactStatus(@Param("id", zod(z.uuid())) id: string, @Body(zod(z.object({ status: z.enum(["new", "read", "archived"]) }))) b: { status: "new" | "read" | "archived" }, @CurrentUser() u: SessionUser) {
    return this.inbox.updateContact(id, b.status, u.id);
  }

  @Delete("contact/:id") @HttpCode(204)
  async contactDelete(@Param("id", zod(z.uuid())) id: string, @CurrentUser() u: SessionUser) { await this.inbox.remove("contact", id, u.id); }

  @Delete("quotes/:id") @HttpCode(204)
  async quoteDelete(@Param("id", zod(z.uuid())) id: string, @CurrentUser() u: SessionUser) { await this.inbox.remove("quotes", id, u.id); }

  @Get("quotes") @Header("Cache-Control", NO_STORE)
  quotes(@Query(zod(statusQuery(["new", "quoted", "accepted", "declined", "closed"]))) q: { page: number; pageSize: number; status?: string }) { return this.inbox.list("quotes", q); }

  @Patch("quotes/:id")
  quote(
    @Param("id", zod(z.uuid())) id: string,
    @Body(zod(z.object({ status: z.enum(["new", "quoted", "accepted", "declined", "closed"]), quotedAmount: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).nullable().optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional() })))
    b: { status: "new" | "quoted" | "accepted" | "declined" | "closed"; quotedAmount?: string | null; currency?: string },
    @CurrentUser() u: SessionUser,
  ) {
    return this.inbox.updateQuote(id, b, u.id);
  }

  @Get("subscribers") @Header("Cache-Control", NO_STORE)
  subscribers(@Query(zod(statusQuery(["pending", "confirmed", "unsubscribed"]))) q: { page: number; pageSize: number; status?: string }) { return this.inbox.list("subscribers", q); }
}
