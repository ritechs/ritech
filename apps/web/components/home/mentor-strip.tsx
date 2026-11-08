"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentorTile } from "@/components/home/mentor-tile";
import type { Mentor } from "@/lib/types";

/** All popular mentors in a row of portrait cards that scrolls sideways, with previous/next buttons. */
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
        <h3 className="font-headline text-2xl font-semibold tracking-[0.02em] text-brand uppercase">
          Popular Mentors <span className="text-muted-ink numerals-tabular">({mentors.length})</span>
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
        className="-mx-2 mt-3 grid snap-x snap-mandatory scroll-px-2 auto-cols-[72%] grid-flow-col gap-5 overflow-x-auto px-2 pt-3 pb-6 [scrollbar-width:thin] sm:auto-cols-[calc(50%-0.625rem)] md:auto-cols-[calc((100%-2.5rem)/3)]"
      >
        {mentors.map((m) => (
          <li key={m.slug} className="snap-start">
            <MentorTile mentor={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}
