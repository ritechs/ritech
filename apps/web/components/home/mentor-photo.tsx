"use client";

import { useCallback, useState } from "react";
import { LegacyImage } from "@/components/media/legacy-image";
import type { Mentor } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

/** Photos narrower than this would look blurry stretched across the card. */
const MIN_COVER_WIDTH = 360;

/**
 * The mentor card's photo. Large photos fill the card; small ones (many
 * photos from the old site are only 100–200 px wide) are shown sharp in a
 * round frame over a soft, blurred copy of themselves, so nothing is
 * stretched. Nothing shows until the size is known, so the card never jumps.
 */
export function MentorPhoto({ mentor }: { mentor: Mentor }) {
  const [mode, setMode] = useState<"pending" | "cover" | "framed">("pending");
  const onSize = useCallback((w: number) => setMode(w >= MIN_COVER_WIDTH ? "cover" : "framed"), []);
  const monogram = (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-brand font-headline text-6xl font-semibold text-white/85">
      {initials(mentor.name)}
    </span>
  );

  if (mode === "framed") {
    return (
      <>
        <span aria-hidden className="absolute inset-0 scale-125 opacity-60 blur-2xl saturate-150">
          <LegacyImage path={mentor.photo} alt="" sizes="160px" fallback={null} />
        </span>
        <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_20%,var(--brand-darkest)_95%)] opacity-70" />
        <span className="absolute top-[40%] left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-[0_12px_28px_-10px_rgb(0_0_0/0.6)] ring-4 ring-white/90 transition-transform duration-500 group-hover:scale-[1.04]">
          <LegacyImage path={mentor.photo} alt="" sizes="144px" fallback={monogram} />
        </span>
      </>
    );
  }

  return (
    <LegacyImage
      path={mentor.photo}
      alt=""
      sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 75vw"
      onSize={onSize}
      className={cn("transition-[transform,opacity] duration-500 group-hover:scale-[1.05]", mode === "pending" && "opacity-0")}
      fallback={monogram}
    />
  );
}
