import { Module } from "@nestjs/common";
import { AdminDashboardController, AdminSecurityController, AdminStaffController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({ controllers: [AdminDashboardController, AdminSecurityController, AdminStaffController], providers: [AdminService] })
export class AdminModule {}
