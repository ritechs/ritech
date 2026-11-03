import { Module } from "@nestjs/common";
import { InboxModule } from "../inbox/inbox.module.js";
import { MailingController } from "./mailing.controller.js";
import { MailingService } from "./mailing.service.js";

@Module({ imports: [InboxModule], controllers: [MailingController], providers: [MailingService] })
export class MailingModule {}
