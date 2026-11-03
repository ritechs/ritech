import { cn } from "@/lib/utils";

/**
 * Renders rich text that the API has already sanitised (allow-listed tags,
 * no scripts or event handlers). Never pass unsanitised HTML here.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[1.0625rem] leading-[1.75] text-ink/90",
        "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink",
        "[&_li]:mt-2 [&_li]:pl-1 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:marker:text-brand",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
