import { pgEnum } from "drizzle-orm/pg-core";
import {
  ATTENDANCE_MODES_DB,
  EVENT_TYPES_DB,
  MEMBER_STATUSES_DB,
  MEMBER_TYPES_DB,
  PUBLISH_STATUSES_DB,
  QUOTE_SERVICES_DB,
} from "./values.js";

export const memberType = pgEnum("member_type", MEMBER_TYPES_DB);
export const memberStatus = pgEnum("member_status", MEMBER_STATUSES_DB);
export const publishStatus = pgEnum("publish_status", PUBLISH_STATUSES_DB);
export const eventType = pgEnum("event_type", EVENT_TYPES_DB);
export const attendanceMode = pgEnum("attendance_mode", ATTENDANCE_MODES_DB);
export const quoteService = pgEnum("quote_service", QUOTE_SERVICES_DB);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const registrationStatus = pgEnum("registration_status", ["pending", "confirmed", "waitlisted", "cancelled"]);
export const quoteStatus = pgEnum("quote_status", ["new", "quoted", "accepted", "declined", "closed"]);
export const inboxStatus = pgEnum("inbox_status", ["new", "read", "archived"]);
export const subscriberStatus = pgEnum("subscriber_status", ["pending", "confirmed", "unsubscribed"]);
export const campaignStatus = pgEnum("campaign_status", ["draft", "queued", "sending", "sent", "failed", "cancelled"]);
export const lookupKind = pgEnum("lookup_kind", ["reference_style", "required_area"]);
export const mediaPurpose = pgEnum("media_purpose", ["avatar", "logo", "cover", "document", "gallery", "content"]);
