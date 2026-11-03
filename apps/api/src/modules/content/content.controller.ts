import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common";
import { eventRegistrationSchema } from "@ritechs/shared";
import type { Response } from "express";
import { z } from "zod";
import { AdminOnly, CurrentUser, Public, Staff } from "../../auth/decorators.js";
import type { SessionUser } from "../../auth/auth.service.js";
import { NO_STORE, PUBLIC_CACHE, listQuery, slugParam, type ListQuery } from "../../common/http.js";
import { zod } from "../../common/zod.pipe.js";
import { ConferencesService } from "./conferences.service.js";
import {
  albumInput,
  conferenceInput,
  contentListQuery,
  eventInput,
  eventListQuery,
  expertiseInput,
  lookupInput,
  lookupQuery,
  type LookupInput,
  newsInput,
  organisationInput,
  pageInput,
  publicationInput,
  publicationQuery,
  speakerInput,
  type AlbumInput,
  type ConferenceInput,
  type EventInput,
  type NewsInput,
  type OrganisationInput,
  type PageInput,
  type PublicationInput,
  type SpeakerInput,
} from "./content.schemas.js";
import { EventsService } from "./events.service.js";
import { LibraryService } from "./library.service.js";

const id = zod(z.uuid());
const slug = zod(slugParam);
type Reg = z.infer<typeof eventRegistrationSchema>;

/* ================================= public ================================= */

@Controller()
@Public()
export class PublicContentController {
  constructor(
    private readonly conferences: ConferencesService,
    private readonly events: EventsService,
    private readonly lib: LibraryService,
  ) {}

  @Get("conferences")
  @Header("Cache-Control", PUBLIC_CACHE)
  conferenceList(@Query(zod(listQuery)) q: ListQuery) {
    return this.conferences.list(q, true);
  }

  @Get("conferences/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  conference(@Param("slug", slug) s: string) {
    return this.conferences.get(s, true);
  }

  @Post("conferences/:slug/registrations")
  @HttpCode(202)
  conferenceRegister(@Param("slug", slug) s: string, @Body(zod(eventRegistrationSchema)) body: Reg) {
    return this.conferences.register(s, body);
  }

  @Get("events")
  @Header("Cache-Control", PUBLIC_CACHE)
  eventList(@Query(zod(eventListQuery)) q: z.infer<typeof eventListQuery>) {
    return this.events.list(q, true);
  }

  @Get("events/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  event(@Param("slug", slug) s: string) {
    return this.events.get(s, true);
  }

  @Post("events/:slug/registrations")
  @HttpCode(202)
  eventRegister(@Param("slug", slug) s: string, @Body(zod(eventRegistrationSchema)) body: Reg) {
    return this.events.register(s, body);
  }

  @Get("news")
  @Header("Cache-Control", PUBLIC_CACHE)
  newsList(@Query(zod(listQuery)) q: ListQuery) {
    return this.lib.newsList(q, true);
  }

  @Get("news/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  news(@Param("slug", slug) s: string) {
    return this.lib.newsGet(s, true);
  }

  @Get("pages") @Header("Cache-Control", PUBLIC_CACHE)
  pagesPublic() { return this.lib.pageList(true); }
  @Get("pages/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  page(@Param("slug", slug) s: string) {
    return this.lib.pageGet(s, true);
  }

  @Get("partners")
  @Header("Cache-Control", PUBLIC_CACHE)
  partners() {
    return this.lib.partners();
  }

  @Get("publications")
  @Header("Cache-Control", PUBLIC_CACHE)
  publications(@Query(zod(publicationQuery)) q: z.infer<typeof publicationQuery>) {
    return this.lib.publicationList(q, true);
  }

  @Get("publications/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  publication(@Param("slug", slug) s: string) {
    return this.lib.publicationGet(s, true);
  }

  @Get("expertise")
  @Header("Cache-Control", PUBLIC_CACHE)
  expertise() {
    return this.lib.expertiseList(true);
  }

  @Get("gallery")
  @Header("Cache-Control", PUBLIC_CACHE)
  albums() {
    return this.lib.albums(true);
  }

  @Get("gallery/:slug")
  @Header("Cache-Control", PUBLIC_CACHE)
  album(@Param("slug", slug) s: string) {
    return this.lib.album(s, true);
  }
}

/* ================================== admin ================================= */

@Controller("admin")
@Staff()
export class AdminContentController {
  constructor(
    private readonly conferences: ConferencesService,
    private readonly events: EventsService,
    private readonly lib: LibraryService,
  ) {}

  // conferences
  @Get("conferences") @Header("Cache-Control", NO_STORE)
  conferenceList(@Query(zod(contentListQuery)) q: z.infer<typeof contentListQuery>) { return this.conferences.list(q, false); }
  @Get("conferences/:id") @Header("Cache-Control", NO_STORE)
  conference(@Param("id", id) i: string) { return this.conferences.get(i, false); }
  @Post("conferences")
  conferenceCreate(@Body(zod(conferenceInput)) b: ConferenceInput, @CurrentUser() u: SessionUser) { return this.conferences.save(b, u.id); }
  @Put("conferences/:id")
  conferenceUpdate(@Param("id", id) i: string, @Body(zod(conferenceInput)) b: ConferenceInput, @CurrentUser() u: SessionUser) { return this.conferences.save(b, u.id, i); }
  @Delete("conferences/:id") @AdminOnly() @HttpCode(204)
  async conferenceDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.conferences.remove(i, u.id); }
  @Get("conferences/:id/registrations") @Header("Cache-Control", NO_STORE)
  conferenceRegs(@Param("id", id) i: string, @Query(zod(listQuery)) q: ListQuery) { return this.events.registrations({ conferenceId: i }, q); }
  @Get("conferences/:id/registrations.csv")
  async conferenceCsv(@Param("id", id) i: string, @CurrentUser() u: SessionUser, @Res() res: Response) { this.sendCsv(res, await this.events.exportCsv({ conferenceId: i }, u.id), "conference-registrations.csv"); }

  // events
  @Get("events") @Header("Cache-Control", NO_STORE)
  eventList(@Query(zod(eventListQuery.extend({ status: contentListQuery.shape.status }))) q: z.infer<typeof eventListQuery> & { status?: string }) { return this.events.list(q, false); }
  @Get("events/:id") @Header("Cache-Control", NO_STORE)
  event(@Param("id", id) i: string) { return this.events.get(i, false); }
  @Post("events")
  eventCreate(@Body(zod(eventInput)) b: EventInput, @CurrentUser() u: SessionUser) { return this.events.save(b, u.id); }
  @Put("events/:id")
  eventUpdate(@Param("id", id) i: string, @Body(zod(eventInput)) b: EventInput, @CurrentUser() u: SessionUser) { return this.events.save(b, u.id, i); }
  @Delete("events/:id") @AdminOnly() @HttpCode(204)
  async eventDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.events.remove(i, u.id); }
  @Get("events/:id/registrations") @Header("Cache-Control", NO_STORE)
  eventRegs(@Param("id", id) i: string, @Query(zod(listQuery)) q: ListQuery) { return this.events.registrations({ eventId: i }, q); }
  @Get("events/:id/registrations.csv")
  async eventCsv(@Param("id", id) i: string, @CurrentUser() u: SessionUser, @Res() res: Response) { this.sendCsv(res, await this.events.exportCsv({ eventId: i }, u.id), "event-registrations.csv"); }
  @Get("registrations") @Header("Cache-Control", NO_STORE)
  allRegs(@Query(zod(listQuery.extend({ kind: z.enum(["event", "conference"]).optional(), status: z.enum(["pending", "confirmed", "waitlisted", "cancelled"]).optional() }))) q: ListQuery & { kind?: "event" | "conference"; status?: string }) {
    return this.events.allRegistrations(q);
  }
  @Get("registrations.csv")
  async allRegsCsv(@CurrentUser() u: SessionUser, @Res() res: Response) { this.sendCsv(res, await this.events.exportCsv({}, u.id), "registrations.csv"); }
  @Delete("registrations/:id") @AdminOnly() @HttpCode(204)
  async regDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.events.removeRegistration(i, u.id); }
  @Patch("registrations/:id")
  regStatus(@Param("id", id) i: string, @Body(zod(z.object({ status: z.enum(["pending", "confirmed", "waitlisted", "cancelled"]) }))) b: { status: "pending" | "confirmed" | "waitlisted" | "cancelled" }, @CurrentUser() u: SessionUser) {
    return this.events.setRegistrationStatus(i, b.status, u.id);
  }

  // news
  @Get("news") @Header("Cache-Control", NO_STORE)
  newsList(@Query(zod(contentListQuery)) q: z.infer<typeof contentListQuery>) { return this.lib.newsList(q, false); }
  @Get("news/:id") @Header("Cache-Control", NO_STORE)
  news(@Param("id", id) i: string) { return this.lib.newsGet(i, false); }
  @Post("news")
  newsCreate(@Body(zod(newsInput)) b: NewsInput, @CurrentUser() u: SessionUser) { return this.lib.newsSave(b, u.id); }
  @Put("news/:id")
  newsUpdate(@Param("id", id) i: string, @Body(zod(newsInput)) b: NewsInput, @CurrentUser() u: SessionUser) { return this.lib.newsSave(b, u.id, i); }
  @Delete("news/:id") @HttpCode(204)
  async newsDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.newsRemove(i, u.id); }

  // pages
  @Get("pages") @Header("Cache-Control", NO_STORE)
  pages() { return this.lib.pageList(); }
  @Get("pages/:slug") @Header("Cache-Control", NO_STORE)
  page(@Param("slug", slug) s: string) { return this.lib.pageGet(s, false); }
  @Put("pages")
  pageSave(@Body(zod(pageInput)) b: PageInput, @CurrentUser() u: SessionUser) { return this.lib.pageSave(b, u.id); }
  @Delete("pages/:slug") @HttpCode(204)
  async pageDelete(@Param("slug", slug) sl: string, @CurrentUser() u: SessionUser) { await this.lib.pageRemove(sl, u.id); }

  // organisations (partners and sponsors)
  @Get("organisations") @Header("Cache-Control", NO_STORE)
  orgs(@Query(zod(listQuery)) q: ListQuery) { return this.lib.organisationList(q); }
  @Post("organisations")
  orgCreate(@Body(zod(organisationInput)) b: OrganisationInput, @CurrentUser() u: SessionUser) { return this.lib.organisationSave(b, u.id); }
  @Put("organisations/:id")
  orgUpdate(@Param("id", id) i: string, @Body(zod(organisationInput)) b: OrganisationInput, @CurrentUser() u: SessionUser) { return this.lib.organisationSave(b, u.id, i); }
  @Delete("organisations/:id") @AdminOnly() @HttpCode(204)
  async orgDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.organisationRemove(i, u.id); }

  // speakers
  @Get("speakers") @Header("Cache-Control", NO_STORE)
  speakers(@Query(zod(listQuery)) q: ListQuery) { return this.lib.speakerList(q); }
  @Post("speakers")
  speakerCreate(@Body(zod(speakerInput)) b: SpeakerInput, @CurrentUser() u: SessionUser) { return this.lib.speakerSave(b, u.id); }
  @Put("speakers/:id")
  speakerUpdate(@Param("id", id) i: string, @Body(zod(speakerInput)) b: SpeakerInput, @CurrentUser() u: SessionUser) { return this.lib.speakerSave(b, u.id, i); }
  @Delete("speakers/:id") @AdminOnly() @HttpCode(204)
  async speakerDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.speakerRemove(i, u.id); }

  // publications
  @Get("publications") @Header("Cache-Control", NO_STORE)
  pubs(@Query(zod(publicationQuery.extend({ status: contentListQuery.shape.status }))) q: z.infer<typeof publicationQuery> & { status?: string }) { return this.lib.publicationList(q, false); }
  @Get("publications/:id") @Header("Cache-Control", NO_STORE)
  pub(@Param("id", id) i: string) { return this.lib.publicationGet(i, false); }
  @Post("publications")
  pubCreate(@Body(zod(publicationInput)) b: PublicationInput, @CurrentUser() u: SessionUser) { return this.lib.publicationSave(b, u.id); }
  @Put("publications/:id")
  pubUpdate(@Param("id", id) i: string, @Body(zod(publicationInput)) b: PublicationInput, @CurrentUser() u: SessionUser) { return this.lib.publicationSave(b, u.id, i); }
  @Delete("publications/:id") @HttpCode(204)
  async pubDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.publicationRemove(i, u.id); }

  // expertise
  @Get("expertise") @Header("Cache-Control", NO_STORE)
  expertise() { return this.lib.expertiseList(false); }
  @Post("expertise")
  expertiseCreate(@Body(zod(expertiseInput)) b: z.infer<typeof expertiseInput>, @CurrentUser() u: SessionUser) { return this.lib.expertiseSave(b, u.id); }
  @Put("expertise/:id")
  expertiseUpdate(@Param("id", id) i: string, @Body(zod(expertiseInput)) b: z.infer<typeof expertiseInput>, @CurrentUser() u: SessionUser) { return this.lib.expertiseSave(b, u.id, i); }
  @Delete("expertise/:id") @AdminOnly() @HttpCode(204)
  async expertiseDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.expertiseRemove(i, u.id); }

  // form options (reference styles, required areas)
  @Get("lookups") @Header("Cache-Control", NO_STORE)
  lookups(@Query(zod(lookupQuery)) q: z.infer<typeof lookupQuery>) { return this.lib.lookupList(q.kind, false); }
  @Post("lookups")
  lookupCreate(@Body(zod(lookupInput)) b: LookupInput, @CurrentUser() u: SessionUser) { return this.lib.lookupSave(b, u.id); }
  @Put("lookups/:id")
  lookupUpdate(@Param("id", id) i: string, @Body(zod(lookupInput)) b: LookupInput, @CurrentUser() u: SessionUser) { return this.lib.lookupSave(b, u.id, i); }
  @Delete("lookups/:id") @HttpCode(204)
  async lookupDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.lookupRemove(i, u.id); }

  // gallery
  @Get("gallery") @Header("Cache-Control", NO_STORE)
  albums() { return this.lib.albums(false); }
  @Get("gallery/:id") @Header("Cache-Control", NO_STORE)
  album(@Param("id", id) i: string) { return this.lib.album(i, false); }
  @Post("gallery")
  albumCreate(@Body(zod(albumInput)) b: AlbumInput, @CurrentUser() u: SessionUser) { return this.lib.albumSave(b, u.id); }
  @Put("gallery/:id")
  albumUpdate(@Param("id", id) i: string, @Body(zod(albumInput)) b: AlbumInput, @CurrentUser() u: SessionUser) { return this.lib.albumSave(b, u.id, i); }
  @Delete("gallery/:id") @HttpCode(204)
  async albumDelete(@Param("id", id) i: string, @CurrentUser() u: SessionUser) { await this.lib.albumRemove(i, u.id); }

  private sendCsv(res: Response, csv: string, name: string) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Cache-Control", NO_STORE);
    res.send(`﻿${csv}`);
  }
}
