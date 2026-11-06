/**
 * Formatted text written in the dashboards' rich text editor.
 *
 * Every multi-line field that the dashboards edit is stored as sanitised HTML.
 * Text can still arrive as plain text (public forms such as registration and
 * contact, the API, old records); it is converted to the same HTML on the
 * server. The API registers the sanitiser at start-up (setRichTextSanitizer),
 * so whatever passes these schemas there is clean, allow-listed HTML. In the
 * browser the schemas only check lengths.
 */
import { z } from "zod";

/** Looks like HTML from the editor or the sanitiser (starts with a block element). */
export function isRichHtml(value: string | null | undefined): boolean {
  return !!value && /^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]/i.test(value);
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text to HTML: blank lines separate paragraphs, lines starting with "- " or "• " become a bullet list. */
export function textToRichHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      return `<p>${lines.map(esc).join("<br>")}</p>`;
    })
    .join("");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** The visible text of rich HTML (or plain text, returned tidied): for lengths, metadata, emails and search. */
export function richToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (!isRichHtml(value)) return value.replace(/\r\n?/g, "\n").trim();
  return value
    .replace(/<\/p>\s*<\/li>/gi, "</li>")
    .replace(/<li[^>]*>\s*(<p[^>]*>)?/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|blockquote|figcaption|tr)>/gi, "\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A one-line summary of rich text, cut at a word boundary (meta descriptions, previews). */
export function richExcerpt(value: string | null | undefined, max = 155): string {
  const text = richToPlainText(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).trimEnd()}…`;
}

export type RichTextMode = "full" | "short";
type Sanitizer = (html: string, mode: RichTextMode) => string;
let sanitizer: Sanitizer | null = null;

/** Called once by the API: every richText() value is converted and sanitised by it. */
export function setRichTextSanitizer(fn: Sanitizer) {
  sanitizer = fn;
}

/**
 * A rich text field. `max` and `min` count the visible characters (not the HTML
 * tags). "full" allows headings, images, alignment and so on; "short" is for
 * summaries and messages (bold, italic, underline, links, lists, colour).
 */
export const richText = (max = 5000, min = 0, mode: RichTextMode = "short") =>
  z
    .string()
    .max(max * 8 + 2000, `Use ${max} characters or fewer.`)
    // eslint-disable-next-line no-control-regex
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n").trim())
    .transform((s) => {
      const empty = !richToPlainText(s).trim() && !/<img\s/i.test(s);
      if (empty) return "";
      if (!isRichHtml(s)) s = s.replace(/\n{3,}/g, "\n\n");
      return sanitizer ? sanitizer(isRichHtml(s) ? s : textToRichHtml(s), mode) : s;
    })
    .superRefine((s, ctx) => {
      const n = richToPlainText(s).length;
      if (n > max) ctx.addIssue({ code: "custom", message: `Use ${max} characters or fewer.` });
      if (n < min) ctx.addIssue({ code: "custom", message: min <= 1 ? "Write something first." : `Write at least ${min} characters.` });
    });
