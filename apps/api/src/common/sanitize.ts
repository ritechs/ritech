/**
 * Rich text from the dashboards' editor is stored already sanitised. The
 * allowlists cover what editorial content needs and nothing that can run script.
 *
 * - full:  articles, descriptions, conference sections, page text, newsletters
 * - short: summaries, biographies and messages (no headings, images or tables)
 *
 * Inline styles are limited to text colour, highlight colour and alignment,
 * and only with plain colour values.
 */
import sanitizeHtml from "sanitize-html";
import { setRichTextSanitizer, type RichTextMode } from "@ritechs/shared";

const colour = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i];
const align = [/^(left|right|center|justify)$/];

const base: sanitizeHtml.IOptions = {
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  allowedStyles: {
    span: { color: colour },
    mark: { "background-color": colour, color: [/^inherit$/] },
    p: { "text-align": align },
    h2: { "text-align": align },
    h3: { "text-align": align },
    h4: { "text-align": align },
    li: { "text-align": align },
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer nofollow", ...(attribs.target ? { target: "_blank" } : {}) },
    }),
  },
};

const full: sanitizeHtml.IOptions = {
  ...base,
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "u", "s", "mark", "span", "blockquote", "ul", "ol", "li", "a", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "img"],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "width", "height"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    span: ["style"],
    mark: ["style", "data-color"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    // Checklists: <ul data-type="taskList"><li data-type="taskItem" data-checked="true">…
    ul: ["data-type"],
    li: ["data-type", "data-checked", "style"],
  },
};

const short: sanitizeHtml.IOptions = {
  ...base,
  allowedTags: ["p", "br", "strong", "em", "u", "s", "mark", "span", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    span: ["style"],
    mark: ["style", "data-color"],
    p: ["style"],
    ul: ["data-type"],
    li: ["data-type", "data-checked", "style"],
  },
  // Headings pasted into a short field become plain paragraphs.
  transformTags: { ...base.transformTags, h1: "p", h2: "p", h3: "p", h4: "p", h5: "p", h6: "p", blockquote: "p", div: "p" },
};

/** Keep only the checklist values the editor produces. */
function tidy(html: string) {
  return html
    .replace(/\sdata-type="(?!taskList"|taskItem")[^"]*"/g, "")
    .replace(/\sdata-checked="(?!true"|false")[^"]*"/g, "")
    .replace(/<span>\s*<\/span>/g, "")
    .replace(/<p>\s*<\/p>/g, "")
    .trim();
}

export const sanitizeRichText = (html: string) => tidy(sanitizeHtml(html, full));
export const sanitizeShortRichText = (html: string) => tidy(sanitizeHtml(html, short));
export const sanitizeByMode = (html: string, mode: RichTextMode) => (mode === "full" ? sanitizeRichText(html) : sanitizeShortRichText(html));

// Every richText() field validated in this process is converted and sanitised.
setRichTextSanitizer(sanitizeByMode);

/** Escape for plain text interpolated into email HTML. */
export const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
