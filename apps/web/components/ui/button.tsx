import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * RiTECHS button. Restrained: small radius, no shadow, weight-500 Plex Sans.
 * `link` is an inline text action for article lists and section footers.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none aria-disabled:pointer-events-none aria-disabled:opacity-55 disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-strong active:bg-brand-deep",
        outline: "border border-brand/35 bg-surface text-brand hover:border-brand hover:bg-brand-wash",
        inverse: "bg-white text-brand hover:bg-brand-wash",
        "outline-inverse": "border border-white/35 text-white hover:border-white/70 hover:bg-white/5",
        /** Amber call to action, used on dark bands of the home page. */
        highlight: "bg-highlight text-on-highlight hover:brightness-105 active:brightness-95 focus-visible:outline-white",
        ghost: "text-ink hover:bg-ink/5",
        link: "h-auto rounded-sm px-0 text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand",
      },
      size: {
        default: "h-11 px-5 text-[0.9375rem]",
        sm: "h-11 px-3.5 text-sm md:h-9",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
        inline: "text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
