"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentorCard } from "@/components/mentors/mentor-card";
import type { Mentor } from "@/lib/types";

/** All popular mentors in a two-row strip that scrolls sideways, with previous/next buttons. */
export function MentorStrip({ mentors }: { mentors: Mentor[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const page = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-2xl text-ink">
          Popular Mentors <span className="text-faint-ink numerals-tabular">({mentors.length})</span>
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => page(-1)} disabled={edge.start} aria-label="Previous mentors" aria-controls="mentor-strip">
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant="outline" size="icon" onClick={() => page(1)} disabled={edge.end} aria-label="More mentors" aria-controls="mentor-strip">
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <ul
        id="mentor-strip"
        ref={ref}
        aria-label="Popular mentors"
        className="mt-5 grid snap-x snap-mandatory auto-cols-[minmax(17rem,85%)] grid-flow-col grid-rows-2 gap-4 overflow-x-auto pb-3 [scrollbar-width:thin] sm:auto-cols-[minmax(19rem,calc(50%-0.5rem))]"
      >
        {mentors.map((m) => (
          <li key={m.slug} className="snap-start">
            <MentorCard mentor={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}
