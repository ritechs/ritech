"use client";

import { useEffect, useRef } from "react";

type Tag = "div" | "li" | "article" | "section" | "header";

/**
 * Slides its content up and fades it in the first time it scrolls into view,
 * like the card rows on usf.edu. `index` staggers items in the same row.
 * The styles live in globals.css ([data-reveal]); with reduced motion or
 * without JavaScript the content simply shows.
 */
export function Reveal({
  as: Comp = "div",
  index = 0,
  fade = false,
  className,
  children,
}: {
  as?: Tag;
  index?: number;
  /** Fade only, no movement (large blocks). */
  fade?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.setAttribute("data-shown", "");
    if (typeof IntersectionObserver === "undefined") return show();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      // The huge top margin counts anything already scrolled past as "seen", so items
      // skipped by a jump (End key, #anchor links) are shown rather than left invisible.
      { rootMargin: "100000px 0px -8% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Comp
      ref={ref as React.Ref<never>}
      data-reveal={fade ? "fade" : "up"}
      className={className}
      style={{ "--reveal-i": index } as React.CSSProperties}
    >
      {children}
    </Comp>
  );
}
