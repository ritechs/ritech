/**
 * On-demand revalidation, called by the API's job worker after content
 * changes. Protected by a shared secret compared in constant time.
 */
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

const TAG = /^[a-z0-9:_-]{1,120}$/i;

function authorised(header: string | null) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req.headers.get("authorization"))) return Response.json({ error: "unauthorised" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, 50) : [];
  // expire: 0 → the next visitor gets fresh content (an edit should show immediately).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
