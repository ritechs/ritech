import { cacheLife } from "next/cache";

/**
 * Today's date (YYYY-MM-DD, UTC), cached for an hour so pages stay static
 * while conference "upcoming / concluded" labels still move on their own.
 */
export async function getToday() {
  "use cache";
  cacheLife("hours");
  return new Date().toISOString().slice(0, 10);
}
