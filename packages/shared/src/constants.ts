/** Account roles stored by Better Auth (admin plugin). Members are "user"; staff are editor/admin. */
export const ROLES = ["user", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_TYPES = ["mentor", "mentee"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

/** Membership review state. Only approved members appear publicly or use member features. */
export const MEMBER_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const PUBLISH_STATUSES = ["draft", "published", "archived"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const EVENT_TYPES = ["seminar", "bootcamp", "research-adda", "cyber4me", "workshop", "webinar"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const ATTENDANCE_MODES = ["in-person", "online", "hybrid"] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];

export const QUOTE_SERVICES = ["editing", "proofreading", "formatting", "poster", "training", "other"] as const;
export type QuoteService = (typeof QUOTE_SERVICES)[number];

export const genders = ["Male", "Female"] as const;

/** Registration options, matching the ritechs.org mentor and mentee forms. */
export const positions: Record<MemberType, readonly string[]> = {
  mentor: ["Lecturer", "Senior Lecturer", "Associate Professor", "Research Fellow", "Professor", "Industrial Researcher", "Scientist"],
  mentee: ["Student", "Professional"],
};

export const qualifications: Record<MemberType, readonly string[]> = {
  mentor: ["Ph.D.", "MD", "MBChB", "Other"],
  mentee: ["Graduate", "Diploma"],
};

export const photoRules = {
  types: ["image/jpeg", "image/png", "image/gif"] as const,
  accept: ".jpg,.jpeg,.png,.gif",
  maxBytes: 2 * 1024 * 1024,
  label: "JPG, GIF or PNG. Max size of 2MB",
};

export const BIO_MIN_MENTOR = 50;
export const BIO_MAX = 600;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
