import { Module } from "@nestjs/common";
import { AdminMembersController, DirectoryController, MeController, MembersController } from "./members.controller.js";
import { MembersService } from "./members.service.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";

@Module({
  imports: [WorkspaceModule],
  controllers: [MembersController, MeController, DirectoryController, AdminMembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
