import { isRichHtml } from "@ritechs/shared";
import { cn } from "@/lib/utils";

/**
 * Renders rich text that the API has already sanitised (allow-listed tags and
 * styles, no scripts or event handlers). Never pass unsanitised HTML here.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn("rich-content max-w-[68ch] text-[1.0625rem] leading-[1.75] text-ink/90", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Any multi-line field written in the dashboards: sanitised HTML from the
 * editor, or plain text from older records and public forms (shown with its
 * line breaks, never as HTML). `compact` for summaries, bios and messages.
 */
export function RichContent({ value, compact = false, className }: { value: string | null | undefined; compact?: boolean; className?: string }) {
  if (!value) return null;
  if (isRichHtml(value)) {
    return <div className={cn("rich-content", compact && "rich-content-compact", className)} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <div className={cn("whitespace-pre-line", className)}>{value}</div>;
}
