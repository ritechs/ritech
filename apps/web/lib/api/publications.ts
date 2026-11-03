/**
 * Publication data access for Server Components. Publications are entered
 * in Admin → Publications; there is no bundled or demo data.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiInternalUrl, NotFoundError, serverApi } from "@/lib/server/api";
import type { Publication } from "@/lib/types";

export interface ApiPublication extends Omit<Publication, "publishedAt" | "source"> {
  publishedOn: string;
}
export const fromApi = ({ publishedOn, ...p }: ApiPublication): Publication => ({ ...p, publishedAt: publishedOn, source: "verified" });

async function list(path: string): Promise<Publication[]> {
  if (!apiInternalUrl) return [];
  try {
    return (await serverApi<{ items: ApiPublication[] }>(path)).items.map(fromApi);
  } catch (err) {
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    throw err;
  }
}

export async function getFeaturedPublications(): Promise<Publication[]> {
  "use cache";
  cacheTag("publications");
  cacheLife("hours");
  return list("/publications?pageSize=12");
}

export async function getAllPublications(): Promise<Publication[]> {
  "use cache";
  cacheTag("publications");
  cacheLife("hours");
  return list("/publications?pageSize=100");
}

export async function getPublicationBySlug(slug: string): Promise<Publication | undefined> {
  "use cache";
  cacheTag("publications", `publication:${slug}`);
  cacheLife("hours");
  if (!apiInternalUrl) return undefined;
  try {
    return fromApi(await serverApi<ApiPublication>(`/publications/${encodeURIComponent(slug)}`));
  } catch (err) {
    if (err instanceof NotFoundError || process.env.NEXT_PHASE === "phase-production-build") return undefined;
    throw err;
  }
}
