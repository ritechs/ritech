import { siteConfig } from "@/lib/site";

/**
 * Social profile links. Lucide no longer ships brand logos, so simple
 * inline marks are used. Only profiles configured in lib/site.ts render.
 */
const icons = {
  linkedin: {
    label: "LinkedIn",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.55 4.77 5.87v5.58h-4v-4.95c0-1.18-.02-2.7-1.7-2.7-1.7 0-1.95 1.28-1.95 2.6v5.05h-4v-11Z",
  },
  facebook: {
    label: "Facebook",
    path: "M13.5 21v-7.5h2.53l.38-2.94H13.5V8.69c0-.85.24-1.43 1.46-1.43h1.56V4.63a20.9 20.9 0 0 0-2.27-.12c-2.25 0-3.79 1.37-3.79 3.89v2.16H7.92v2.94h2.54V21h3.04Z",
  },
  x: {
    label: "X",
    path: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.57L16.67 19.2Z",
  },
  instagram: {
    label: "Instagram",
    path: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm4.98-9.24a1.12 1.12 0 1 0 0 2.24 1.12 1.12 0 0 0 0-2.24ZM21.94 8.1c-.07-1.5-.41-2.84-1.51-3.93-1.1-1.1-2.43-1.44-3.93-1.51C14.95 2.57 9.05 2.57 7.5 2.66c-1.5.07-2.83.41-3.93 1.5S2.13 6.6 2.06 8.1c-.09 1.55-.09 6.25 0 7.8.07 1.5.41 2.84 1.51 3.93 1.1 1.1 2.43 1.44 3.93 1.51 1.55.09 7.45.09 9 0 1.5-.07 2.84-.41 3.93-1.51 1.1-1.1 1.44-2.43 1.51-3.93.09-1.55.09-6.24 0-7.8Zm-2.03 9.47a3.2 3.2 0 0 1-1.8 1.8c-1.25.5-4.21.38-5.59.38s-4.35.11-5.59-.38a3.2 3.2 0 0 1-1.8-1.8c-.5-1.25-.38-4.21-.38-5.59s-.11-4.35.38-5.59a3.2 3.2 0 0 1 1.8-1.8c1.25-.5 4.21-.38 5.59-.38s4.35-.11 5.59.38a3.2 3.2 0 0 1 1.8 1.8c.5 1.25.38 4.21.38 5.59s.12 4.35-.38 5.59Z",
  },
  youtube: {
    label: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  },
} as const;

export function SocialLinks({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  const entries = (Object.keys(icons) as (keyof typeof icons)[]).filter((k) => siteConfig.social[k]);
  if (entries.length === 0) return null;
  return (
    <ul className={["flex items-center gap-1", className].filter(Boolean).join(" ")} aria-label="RiTECHS on social media">
      {entries.map((k) => (
        <li key={k}>
          <a
            href={siteConfig.social[k]}
            rel="noopener noreferrer"
            target="_blank"
            className={inverse ? "inline-flex size-11 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white" : "inline-flex size-11 items-center justify-center rounded-md text-muted-ink hover:bg-ink/5 hover:text-ink"}
          >
            <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="currentColor" aria-hidden>
              <path d={icons[k].path} />
            </svg>
            <span className="sr-only">{icons[k].label} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
