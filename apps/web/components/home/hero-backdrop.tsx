"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Decorative backdrop for the home hero: circuit lines from the left,
 * concentric rings on the right and a rising trend line, in the site's
 * colours. The lines draw once on load (the page's one load moment);
 * static with reduced motion.
 */
const circuits = [
  "M0 140 H560",
  "M60 200 H470",
  "M0 260 H330 L380 210 H640",
  "M110 320 H420 L470 270 H700",
  "M20 380 H250 L300 330 H520",
  "M90 460 H300 L350 510 H660",
  "M0 570 H400 L450 620 H760",
  "M140 680 H600",
  "M30 760 H480",
];
const ends = [
  [560, 140], [470, 200], [640, 210], [700, 270], [520, 330], [660, 510], [760, 620], [600, 680], [480, 760],
];
// Kept to the lower right, clear of the headline and buttons.
const trend = "M1090 880 C1160 850 1200 820 1250 760 S1310 690 1350 650 S1430 550 1460 505 L1590 330";
const nodes = [
  [1090, 880], [1250, 760], [1350, 650], [1460, 505], [1590, 330],
];

export function HeroBackdrop() {
  const reduce = useReducedMotion();
  const draw = (delay: number, duration = 1.4) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration, delay, ease: [0.4, 0, 0.2, 1] as const },
        };
  const pop = (delay: number) =>
    reduce ? { initial: false as const } : { initial: { opacity: 0, scale: 0.3 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.45, delay } };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(110deg,var(--brand-deep)_0%,var(--brand)_48%,var(--brand-darkest)_100%)]" />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <pattern id="hero-dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="rgb(255 255 255 / 0.07)" />
          </pattern>
        </defs>
        <rect width="1600" height="900" fill="url(#hero-dots)" />
        <g fill="none" stroke="rgb(255 255 255 / 0.10)">
          {[140, 230, 320, 410, 500, 590, 680].map((r) => (
            <circle key={r} cx="1250" cy="900" r={r} />
          ))}
        </g>
        <g fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.5">
          {circuits.map((d, i) => (
            <motion.path key={d} d={d} {...draw(0.1 + i * 0.06, 1.1)} />
          ))}
        </g>
        <g fill="var(--brand)" stroke="rgb(255 255 255 / 0.4)" strokeWidth="1.5">
          {ends.map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r="5" style={{ transformOrigin: `${x}px ${y}px` }} {...pop(0.7 + i * 0.05)} />
          ))}
        </g>
        <motion.path d={trend} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="4" strokeLinecap="round" {...draw(0.5, 1.8)} />
        <g fill="var(--brand-deep)" stroke="rgb(255 255 255 / 0.75)" strokeWidth="4">
          {nodes.map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r="13" style={{ transformOrigin: `${x}px ${y}px` }} {...pop(0.9 + i * 0.22)} />
          ))}
        </g>
      </svg>
      {/* Keeps the headline readable over the artwork */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_52%,rgb(0_0_0/0.32),transparent_72%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-darkest/70 to-transparent" />
    </div>
  );
}
