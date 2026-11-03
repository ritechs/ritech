"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PublicationCard } from "@/components/publications/publication-card";
import { researchAreas } from "@/lib/data/research-areas";
import { AREA_FILTER_EVENT, type AreaFilterEventDetail } from "@/lib/search-events";
import type { Publication, ResearchAreaSlug } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = ResearchAreaSlug | "all";

/**
 * Publication grid with research-area filtering. Also listens for
 * research-area links elsewhere on the page so they can apply a filter.
 */
export function PublicationExplorer({
  publications,
  limit,
  initialArea = "all",
}: {
  publications: Publication[];
  limit?: number;
  initialArea?: Filter;
}) {
  const [filter, setFilter] = useState<Filter>(initialArea);
  const applyFilterRef = useRef<(f: Filter) => void>(() => {});
  const reduce = useReducedMotion();

  // URL reflects the filter (?area=…) so filtered views can be shared and survive reloads.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("area");
    if (!fromUrl || !researchAreas.some((a) => a.slug === fromUrl)) return;
    const frame = requestAnimationFrame(() => setFilter(fromUrl as Filter));
    return () => cancelAnimationFrame(frame);
  }, []);

  function applyFilter(next: Filter) {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("area");
    else url.searchParams.set("area", next);
    window.history.replaceState(window.history.state, "", url);
  }

  useEffect(() => {
    const onArea = (e: Event) => {
      const { area } = (e as CustomEvent<AreaFilterEventDetail>).detail;
      if (area === "all" || researchAreas.some((a) => a.slug === area)) applyFilterRef.current(area as Filter);
    };
    window.addEventListener(AREA_FILTER_EVENT, onArea);
    return () => window.removeEventListener(AREA_FILTER_EVENT, onArea);
  }, []);

  useEffect(() => {
    applyFilterRef.current = applyFilter;
  });

  const counts = useMemo(() => {
    const m = new Map<Filter, number>([["all", publications.length]]);
    for (const p of publications) m.set(p.area, (m.get(p.area) ?? 0) + 1);
    return m;
  }, [publications]);

  const visible = useMemo(() => {
    const list = filter === "all" ? publications : publications.filter((p) => p.area === filter);
    return limit ? list.slice(0, limit) : list;
  }, [filter, publications, limit]);

  const options: { value: Filter; label: string }[] = [
    { value: "all", label: "All research" },
    ...researchAreas.map((a) => ({ value: a.slug, label: a.shortName })),
  ];
  const activeLabel = options.find((o) => o.value === filter)?.label;

  return (
    <div>
      <div role="group" aria-label="Filter by research area" className="-mx-5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {options.map((o) => {
            const active = filter === o.value;
            const count = counts.get(o.value) ?? 0;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                disabled={count === 0}
                onClick={() => applyFilter(o.value)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-rule bg-surface text-ink hover:border-brand/50 hover:text-brand",
                  "disabled:opacity-40",
                )}
              >
                {o.label}
                <span className={cn("text-xs numerals-tabular", active ? "text-white/75" : "text-faint-ink")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {visible.length} {visible.length === 1 ? "publication" : "publications"} in {activeLabel}
      </p>

      <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <motion.li
              key={p.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22 }}
            >
              <PublicationCard publication={p} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
