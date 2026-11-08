"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { isOptimisable, legacyAsset } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * An image uploaded to the old site. Falls back to `fallback` (initials or
 * a monogram) if the file is missing or the old server can't be reached.
 */
export function LegacyImage({
  path,
  alt,
  sizes,
  className,
  fit = "cover",
  fallback,
  onSize,
}: {
  path?: string;
  alt: string;
  sizes: string;
  className?: string;
  fit?: "cover" | "contain";
  fallback: React.ReactNode;
  /** Called with the loaded image's pixel size (e.g. to treat small old photos differently). */
  onSize?: (width: number, height: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  // An image can fail before hydration attaches onError; catch that on mount.
  const checkLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !img.complete) return;
      if (img.naturalWidth === 0) requestAnimationFrame(() => setFailed(true));
      else if (onSize) requestAnimationFrame(() => onSize(img.naturalWidth, img.naturalHeight));
    },
    [onSize],
  );
  if (!path || failed) return <>{fallback}</>;
  return (
    <Image
      ref={checkLoaded}
      src={legacyAsset(path)}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={!isOptimisable(path)}
      onError={() => setFailed(true)}
      onLoad={onSize ? (e) => onSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight) : undefined}
      className={cn(fit === "cover" ? "object-cover object-top" : "object-contain", className)}
    />
  );
}
