import { z } from "zod";

/** Public, cacheable reads: browsers 1 min, CDN 5 min, served stale while refreshing. */
export const PUBLIC_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
export const NO_STORE = "private, no-store";

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

export const offsetOf = (q: { page: number; pageSize: number }) => (q.page - 1) * q.pageSize;

export const paged = <T>(items: T[], total: number, q: { page: number; pageSize: number }) => ({
  items,
  total,
  page: q.page,
  pageSize: q.pageSize,
  pages: Math.max(1, Math.ceil(total / q.pageSize)),
});

export const uuidParam = z.uuid();
export const slugParam = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

/** Escape LIKE wildcards in user search text. */
export const likeEscape = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
