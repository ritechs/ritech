"use client";

import { AREA_FILTER_EVENT, type AreaFilterEventDetail } from "@/lib/search-events";

/** Jumps to Featured Research and applies a research-area filter there. */
export function AreaLink({ area, className, children }: { area: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href="#featured"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent<AreaFilterEventDetail>(AREA_FILTER_EVENT, { detail: { area } }));
      }}
    >
      {children}
    </a>
  );
}
