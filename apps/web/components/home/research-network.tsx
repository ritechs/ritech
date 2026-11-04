"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { researchAreas } from "@/lib/data/research-areas";
import { siteConfig } from "@/lib/site";

/**
 * Hero visual: the six research areas as a collaboration network on a
 * brand-coloured panel carrying the RiTECHS logo. Lines draw once on load;
 * static when reduced motion is preferred.
 */
type Pt = { x: number; y: number; anchor: "start" | "middle" | "end"; dx: number; dy: number };

// 340 × 300 artwork; order matches researchAreas.
const layout: Pt[] = [
  { x: 70, y: 74, anchor: "start", dx: -12, dy: -16 }, // AI & ML
  { x: 270, y: 70, anchor: "end", dx: 12, dy: -16 }, // Cybersecurity
  { x: 306, y: 176, anchor: "end", dx: 4, dy: 26 }, // Data science
  { x: 250, y: 262, anchor: "middle", dx: 0, dy: 26 }, // Software eng.
  { x: 62, y: 234, anchor: "start", dx: -14, dy: 26 }, // Sustainable tech
  { x: 34, y: 164, anchor: "start", dx: -4, dy: 26 }, // Emerging tech
];
const HUB = { x: 172, y: 160 };
const links: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 2],
  [1, 3],
  [5, 3],
];

export function ResearchNetwork() {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 1.1, delay, ease: [0.4, 0, 0.2, 1] as const },
        };
  const pop = (delay: number) =>
    reduce
      ? { initial: false as const }
      : { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, delay } };

  return (
    <figure className="relative mx-auto w-full max-w-[30rem] lg:mr-0">
      <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-lg bg-highlight/80 sm:translate-x-4 sm:translate-y-4" />
      <div className="relative overflow-hidden rounded-lg bg-brand text-white shadow-[0_30px_60px_-36px_color-mix(in_srgb,var(--brand-darkest)_80%,transparent)]">
        <div className="flex items-center justify-between gap-6 border-b border-white/15 px-6 py-5 sm:px-7">
          <Image
            src={siteConfig.logo.onDark}
            alt=""
            width={siteConfig.logo.width}
            height={siteConfig.logo.height}
            className="h-11 w-auto"
          />
          <p className="text-right text-xs leading-snug text-white/70">
            Research areas
            <br />
            and collaboration
          </p>
        </div>

        <svg viewBox="0 0 340 310" role="img" aria-labelledby="network-title" className="block w-full px-2 pt-2 sm:px-4">
          <title id="network-title">
            {`Network linking the six RiTECHS research areas: ${researchAreas.map((a) => a.name).join(", ")}.`}
          </title>
          <defs>
            <pattern id="net-grid" width="17" height="17" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.13)" />
            </pattern>
          </defs>
          <rect width="340" height="310" fill="url(#net-grid)" />
          <circle cx={HUB.x} cy={HUB.y} r="112" fill="none" stroke="color-mix(in srgb, var(--brand-tint) 22%, transparent)" strokeDasharray="2 6" />
          <circle cx={HUB.x} cy={HUB.y} r="58" fill="none" stroke="color-mix(in srgb, var(--brand-tint) 16%, transparent)" />

          <g strokeLinecap="round" fill="none">
            {links.map(([a, b], i) => (
              <motion.line
                key={`l${i}`}
                x1={layout[a].x}
                y1={layout[a].y}
                x2={layout[b].x}
                y2={layout[b].y}
                stroke="color-mix(in srgb, var(--brand-tint) 42%, transparent)"
                strokeWidth={1}
                {...draw(0.3 + i * 0.06)}
              />
            ))}
            {layout.map((p, i) => (
              <motion.line
                key={`s${i}`}
                x1={HUB.x}
                y1={HUB.y}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={1.25}
                {...draw(0.1 + i * 0.07)}
              />
            ))}
          </g>

          <motion.circle cx={HUB.x} cy={HUB.y} r={9} fill="#fff" style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }} {...pop(0)} />
          <circle cx={HUB.x} cy={HUB.y} r={3.5} fill="var(--brand)" />

          {researchAreas.map((a, i) => {
            const p = layout[i];
            return (
              <g key={a.slug}>
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill="var(--brand)"
                  stroke="#fff"
                  strokeWidth={1.75}
                  style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  {...pop(0.55 + i * 0.06)}
                />
                <text
                  x={p.x + p.dx}
                  y={p.y + p.dy}
                  textAnchor={p.anchor}
                  className="fill-white/90 font-sans"
                  stroke="var(--brand)"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  style={{ fontSize: 11, paintOrder: "stroke" }}
                >
                  {a.shortName}
                </text>
              </g>
            );
          })}
        </svg>

        <figcaption className="border-t border-white/15 px-6 py-5 sm:px-7">
          <p className="font-serif text-xl leading-snug italic sm:text-[1.375rem]">Six Research Areas, One Community</p>
        </figcaption>
      </div>
    </figure>
  );
}
