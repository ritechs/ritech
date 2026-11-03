"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRaw, type ApiError } from "@/lib/api/client";

/** Loads an admin API resource; `reload()` refetches after a change. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    const res = await apiRaw<T>(path);
    if (id !== seq.current) return; // a newer request superseded this one
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res);
    setLoading(false);
  }, [path]);

  useEffect(() => {
    // Deferred so the effect itself does not set state synchronously.
    const raf = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(raf);
  }, [load]);

  return { data, error, loading, reload: load };
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

/** Mutations. Callers show a toast or field errors from the result. */
export const send = <T = Record<string, unknown>>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) =>
  apiRaw<T>(path, { method, body: body ?? {} });

export const qs = (o: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};
