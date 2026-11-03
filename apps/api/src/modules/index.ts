import { RevalidateModule } from "../common/revalidate.service.js";
import { AdminModule } from "./admin/admin.module.js";
import { ContentModule } from "./content/content.module.js";
import { InboxModule } from "./inbox/inbox.module.js";
import { MailingModule } from "./mailing/mailing.module.js";
import { MembersModule } from "./members/members.module.js";
import { WorkspaceModule } from "./workspace/workspace.module.js";

export const DOMAIN_MODULES = [RevalidateModule, MembersModule, WorkspaceModule, ContentModule, InboxModule, MailingModule, AdminModule];
