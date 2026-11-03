/**
 * The admin editors use plain text: blank lines separate paragraphs, lines
 * starting with "- " become bullet lists. The API sanitises the HTML again.
 */
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToHtml(text: string): string {
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
    .join("\n");
}

const unesc = (v: string) => v.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return unesc(
    html
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|ul|ol|h[2-4]|blockquote)>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

export const slugify = (v: string) =>
  v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
