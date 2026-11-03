import { Module } from "@nestjs/common";
import { AdminInboxController, PublicInboxController } from "./inbox.controller.js";
import { InboxService } from "./inbox.service.js";

@Module({ controllers: [PublicInboxController, AdminInboxController], providers: [InboxService], exports: [InboxService] })
export class InboxModule {}
