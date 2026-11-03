import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccessGuard } from "./access.guard.js";
import { AuthService } from "./auth.service.js";

@Global()
@Module({
  providers: [AuthService, { provide: APP_GUARD, useClass: AccessGuard }],
  exports: [AuthService],
})
export class AuthModule {}
