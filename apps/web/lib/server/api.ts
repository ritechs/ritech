import "server-only";

/**
 * Server-side reads from the API (Server Components). Calls go straight to
 * the API over the private network with the internal token, so they are not
 * rate-limited as if they came from one visitor. Results are cached by Next.js
 * and refreshed when the API calls /internal/revalidate.
 */
/** The API on this machine unless configured (Docker sets http://api:4000). Same default as the /api rewrite in next.config.ts. */
export const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

export async function serverApi<T>(path: string): Promise<T> {
  const res = await fetch(`${apiInternalUrl}/api${path}`, {
    headers: { Accept: "application/json", ...(process.env.INTERNAL_API_TOKEN ? { "X-Internal-Token": process.env.INTERNAL_API_TOKEN } : {}) },
  });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
  return res.json() as Promise<T>;
}

export class NotFoundError extends Error {}
