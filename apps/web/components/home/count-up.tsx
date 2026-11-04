"use client";

import { useEffect, useRef } from "react";

/**
 * A number that counts up from 0 when it first scrolls into view. The server
 * renders the final value, screen readers always get the final value, and it
 * stays static with reduced motion or when it is already on screen at load.
 * The count is written straight into the DOM, so React does not re-render each frame.
 */
export function CountUp({ value, suffix = "", durationMs = 1400 }: { value: number; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    if (typeof IntersectionObserver === "undefined") return;
    const write = (n: number) => {
      el.textContent = `${n}${suffix}`;
    };
    write(0);
    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          write(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      // As in Reveal: a number skipped by a jump still finishes counting instead of staying at 0.
      { rootMargin: "100000px 0px -15% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      write(value);
    };
  }, [value, suffix, durationMs]);

  return (
    <>
      <span ref={ref} aria-hidden className="numerals-tabular">
        {value}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </>
  );
}
