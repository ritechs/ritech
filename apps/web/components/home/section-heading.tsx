import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Home-page section opener: a small hatched mark, then a condensed uppercase
 * heading (Oswald), optional description and an optional trailing link.
 */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
  inverse = false,
  align = "start",
}: {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  inverse?: boolean;
  align?: "start" | "center";
}) {
  const center = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between md:gap-10",
        className,
      )}
    >
      <div className={cn("max-w-2xl", center && "flex flex-col items-center")}>
        <span aria-hidden className={cn("hatch-mark mb-3.5", inverse ? "text-highlight" : "text-brand")} />
        <h2
          id={id}
          className={cn(
            "font-headline text-[clamp(2rem,1.4rem+2.4vw,2.875rem)] leading-[1.08] font-semibold tracking-[0.01em] uppercase [text-wrap:balance]",
            inverse ? "text-white" : "text-brand",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn("mt-3 text-[1.0625rem] leading-relaxed", inverse ? "text-white/80" : "text-muted-ink")}>{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "tap-target shrink-0 self-start rounded-sm border-b-2 pb-0.5 text-[0.9375rem] font-semibold transition-colors md:self-auto",
            inverse ? "border-highlight/60 text-white hover:border-highlight" : "border-brand-tint text-brand hover:border-brand",
            center && "md:self-center",
          )}
        >
          {action.label} »
        </Link>
      )}
    </div>
  );
}
