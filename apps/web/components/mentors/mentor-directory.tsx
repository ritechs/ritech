"use client";

import { useDeferredValue } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { MentorCard } from "@/components/mentors/mentor-card";
import type { Mentor } from "@/lib/types";

const normalise = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Searchable mentor list. The query lives in the URL (?q=) so results can be shared. */
export function MentorDirectory({ mentors }: { mentors: Mentor[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q") ?? "";
  const deferred = useDeferredValue(q);
  const terms = normalise(deferred).split(/\s+/).filter(Boolean);
  const results = terms.length
    ? mentors.filter((m) => {
        const hay = normalise([m.name, m.role, m.organisation, m.location, m.membership ?? "", ...m.expertise].join(" "));
        return terms.every((t) => hay.includes(t));
      })
    : mentors;

  function setQuery(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search mentors</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint-ink" aria-hidden />
          <input
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            defaultValue={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, university, country or topic, e.g. cybersecurity…"
            className="h-11 w-full rounded-md border border-rule-strong bg-surface pr-3 pl-10 text-[0.9375rem] text-ink placeholder:text-faint-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
          />
        </label>
        <p className="text-sm text-muted-ink numerals-tabular" aria-live="polite">
          {results.length === mentors.length ? `${mentors.length} mentors` : `${results.length} of ${mentors.length} mentors`}
        </p>
      </div>
      {results.length ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((m) => (
            <li key={m.id}>
              <MentorCard mentor={m} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-rule-strong bg-paper p-8 text-center">
          <p className="font-serif text-xl text-ink">No mentors match “{q}”</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="tap-target mt-3 rounded-sm text-sm font-medium text-brand hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </>
  );
}
