import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The supplied RiTECHS logo. The original white artwork is used on
 * dark surfaces; a recolour of the same artwork in the brand colour
 * (identical shapes and proportions) is used on light surfaces.
 */
export function Logo({
  tone = "brand",
  className,
  priority = false,
}: {
  tone?: "brand" | "white";
  className?: string;
  priority?: boolean;
}) {
  const { logo } = siteConfig;
  return (
    <Link href="/" translate="no" className={cn("inline-flex shrink-0 rounded-sm", className)}>
      <Image
        src={tone === "white" ? logo.onDark : logo.onLight}
        alt={`${siteConfig.shortName} — ${siteConfig.name}`}
        width={logo.width}
        height={logo.height}
        priority={priority}
        className="h-full w-auto"
      />
    </Link>
  );
}
