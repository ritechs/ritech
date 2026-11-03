import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-md border border-input bg-surface px-3.5 py-3 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-faint-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15 aria-invalid:border-destructive md:text-[0.9375rem]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
