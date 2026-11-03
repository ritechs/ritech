import { Injectable, Logger } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { currentContext } from "../common/request-context.js";
import { InjectDb } from "../database/database.module.js";

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes to the append-only audit log. Request IP, user agent and the
 * signed-in user are filled in from the request context.
 */
@Injectable()
export class AuditService {
  private readonly log = new Logger("Audit");

  constructor(@InjectDb() private readonly db: Database) {}

  async record(e: AuditEntry): Promise<void> {
    const ctx = currentContext();
    try {
      await this.db.insert(schema.auditLogs).values({
        action: e.action,
        actorId: e.actorId === undefined ? (ctx?.userId ?? null) : e.actorId,
        entityType: e.entityType ?? null,
        entityId: e.entityId ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent?.slice(0, 400) ?? null,
        metadata: e.metadata ?? null,
      });
    } catch (err) {
      // Never fail the user's request because the audit insert failed, but make it loud.
      this.log.error({ err, action: e.action }, "audit write failed");
    }
  }
}
