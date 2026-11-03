"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters, tabs and pages live in the URL, so views can be bookmarked and shared. */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const get = useCallback((k: string, fallback = "") => params.get(k) ?? fallback, [params]);
  const set = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in patch)) next.delete("page");
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [params, router, path],
  );
  return { get, set, page: Math.max(1, Number(params.get("page") ?? 1) || 1) };
}
