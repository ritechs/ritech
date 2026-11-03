/**
 * Enum values duplicated from @ritechs/shared so the database package has no
 * runtime dependency on it. A unit test in the API checks they stay equal.
 */
export const MEMBER_TYPES_DB = ["mentor", "mentee"] as const;
export const MEMBER_STATUSES_DB = ["pending", "approved", "rejected", "suspended"] as const;
export const PUBLISH_STATUSES_DB = ["draft", "published", "archived"] as const;
export const EVENT_TYPES_DB = ["seminar", "bootcamp", "research-adda", "cyber4me", "workshop", "webinar"] as const;
export const ATTENDANCE_MODES_DB = ["in-person", "online", "hybrid"] as const;
export const QUOTE_SERVICES_DB = ["editing", "proofreading", "formatting", "poster", "training", "other"] as const;
