import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service.js";
import { AuthThrottleService } from "./auth-throttle.service.js";
import { IpRulesService } from "./ip-rules.service.js";
import { RateLimitService } from "./rate-limit.service.js";

@Global()
@Module({
  providers: [AuditService, IpRulesService, RateLimitService, AuthThrottleService],
  exports: [AuditService, IpRulesService, RateLimitService, AuthThrottleService],
})
export class SecurityModule {}
