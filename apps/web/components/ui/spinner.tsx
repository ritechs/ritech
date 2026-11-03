import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Loading indicator for pending async actions (CLAUDE.md §3). Decorative: pair it with a "…" label. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 shrink-0 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]", className)} />;
}
