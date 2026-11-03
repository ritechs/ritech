import { Module } from "@nestjs/common";
import { AdminContentController, PublicContentController } from "./content.controller.js";
import { ConferencesService } from "./conferences.service.js";
import { EventsService } from "./events.service.js";
import { LibraryService } from "./library.service.js";
import { StatsController } from "./stats.controller.js";

@Module({
  controllers: [PublicContentController, AdminContentController, StatsController],
  providers: [ConferencesService, EventsService, LibraryService],
})
export class ContentModule {}
