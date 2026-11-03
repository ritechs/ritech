/** Publication search for the browser (search dialog), through the site's same-origin /api. */
import type { Publication, PublicationSearchParams, PublicationSearchResult } from "@/lib/types";

type ApiPublication = Omit<Publication, "publishedAt" | "source"> & { publishedOn: string };
const fromApi = ({ publishedOn, ...p }: ApiPublication): Publication => ({ ...p, publishedAt: publishedOn, source: "verified" });

/** Client-callable search with cancellation. */
export async function searchPublications(params: PublicationSearchParams, signal?: AbortSignal): Promise<PublicationSearchResult> {
  const qs = new URLSearchParams({ q: params.query, pageSize: "50" });
  if (params.area && params.area !== "all") qs.set("area", params.area);
  const res = await fetch(`/api/publications?${qs}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
  const data = (await res.json()) as { items: ApiPublication[]; total: number };
  return { items: data.items.map(fromApi), total: data.total };
}
