import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3.5 text-base text-ink transition-colors outline-none placeholder:text-faint-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive md:text-[0.9375rem]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
