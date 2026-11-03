import type { RegistrationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<RegistrationStatus, { label: string; className: string; dot: string }> = {
  open: { label: "Registration open", className: "bg-success-wash text-success", dot: "bg-success" },
  limited: { label: "Limited places", className: "bg-warning-wash text-warning", dot: "bg-warning" },
  "opening-soon": { label: "Opening soon", className: "bg-brand-wash text-brand", dot: "bg-brand" },
  closed: { label: "Registration closed", className: "bg-muted text-muted-ink", dot: "bg-faint-ink" },
};

export function StatusPill({ status, inverse = false, className }: { status: RegistrationStatus; inverse?: boolean; className?: string }) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        inverse ? "bg-white/12 text-white" : s.className,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", inverse ? "bg-white" : s.dot)} />
      {s.label}
    </span>
  );
}
