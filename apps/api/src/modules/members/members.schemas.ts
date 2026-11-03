import { MEMBER_STATUSES, MEMBER_TYPES, countryCode, line, membershipChangeSchema, profileUpdateSchema } from "@ritechs/shared";
import { z } from "zod";
import { listQuery } from "../../common/http.js";

export const directoryQuery = listQuery.extend({
  country: countryCode.optional(),
  expertise: z.string().trim().max(100).regex(/^[a-z0-9-]+$/).optional(),
  featured: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
});
export type DirectoryQuery = z.infer<typeof directoryQuery>;

export const memberListQuery = listQuery.extend({
  type: z.enum(MEMBER_TYPES).optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
});
export type MemberListQuery = z.infer<typeof memberListQuery>;

export const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reinstate"]),
  note: line(500).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const bulkReviewSchema = z.object({
  userIds: z.array(z.string().min(1).max(64)).min(1).max(100),
  action: z.enum(["approve", "reject"]),
  note: line(500).optional(),
});

export const memberFlagsSchema = z.object({ featured: z.boolean().optional(), showInDirectory: z.boolean().optional() }).refine((v) => Object.keys(v).length > 0, "Nothing to update.");

export const changeReviewSchema = z.object({ action: z.enum(["approve", "reject"]), note: line(500).optional() });
export const changeListQuery = listQuery.extend({ status: z.enum(["pending", "approved", "rejected"]).optional() });

export { membershipChangeSchema, profileUpdateSchema };
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/**
 * Multipart forms send strings; turn them into the shape the shared schema expects.
 * JSON requests pass through unchanged.
 */
export function registrationFromForm(body: Record<string, unknown>) {
  if (typeof body.phone === "object" && body.phone) return body;
  return {
    ...body,
    phone: { country: body.phoneCountry ?? body.country, number: body.phoneNumber ?? body.phone },
    privacy: body.privacy === true || body.privacy === "true" || body.privacy === "on",
  };
}
