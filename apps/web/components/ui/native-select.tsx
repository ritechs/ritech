import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <select> styled to match Input: accessible, and uses the phone's own picker on mobile. */
function NativeSelect({ className, wrapperClassName, children, ...props }: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-md border border-input bg-surface pr-10 pl-3.5 text-base text-ink outline-none transition-colors invalid:text-faint-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15 aria-invalid:border-destructive md:text-[0.9375rem]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-faint-ink" />
    </div>
  );
}

export { NativeSelect };
