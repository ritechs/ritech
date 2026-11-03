import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Section opener: serif heading, optional description, optional trailing link. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
  inverse = false,
}: {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10", className)}>
      <div className="max-w-2xl">
        <h2 id={id} className={cn("font-serif text-h2 font-normal [text-wrap:balance]", inverse ? "text-white" : "text-ink")}>
          {title}
        </h2>
        {description && (
          <p className={cn("mt-3 text-[1.0625rem] leading-relaxed", inverse ? "text-white/75" : "text-muted-ink")}>{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group tap-target inline-flex shrink-0 items-center gap-1.5 self-start rounded-sm text-[0.9375rem] font-medium text-brand hover:text-brand-strong md:self-auto"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
