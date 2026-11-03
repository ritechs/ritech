/**
 * Rich text from the admin editor is stored already sanitised. The allowlist
 * covers what editorial content needs and nothing that can run script.
 */
import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "u", "s", "blockquote", "ul", "ol", "li", "a", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "img"],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "width", "height"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer nofollow", ...(attribs.target ? { target: "_blank" } : {}) },
    }),
  },
};

export const sanitizeRichText = (html: string) => sanitizeHtml(html, options).trim();

/** Escape for plain text interpolated into email HTML. */
export const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
