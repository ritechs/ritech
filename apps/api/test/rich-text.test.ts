/**
 * Formatted text from the dashboards' editor: every rich field is stored as
 * sanitised HTML, plain text is converted, and lengths count visible text.
 */
import { describe, expect, it } from "vitest";
import { isRichHtml, richExcerpt, richText, richToPlainText } from "@ritechs/shared";
import { sanitizeRichText, sanitizeShortRichText } from "../src/common/sanitize.js";

describe("rich text sanitiser", () => {
  it("keeps the editor's formatting", () => {
    const html =
      '<h2 style="text-align: center">Title</h2><p style="text-align: right"><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <span style="color: #ff8a3d">c</span> <mark data-color="#fde68a" style="background-color: #fde68a; color: inherit">h</mark></p>' +
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li></ul><ol><li><p>one</p></li></ol><blockquote><p>q</p></blockquote><p><img src="https://cdn.example.org/a.png" alt="a"></p>';
    const out = sanitizeRichText(html);
    for (const part of ['<h2 style="text-align:center">', '<p style="text-align:right">', "<strong>b</strong>", "<u>u</u>", "<s>s</s>", '<span style="color:#ff8a3d">', 'data-type="taskList"', 'data-checked="true"', "<blockquote>", '<img src="https://cdn.example.org/a.png"']) {
      expect(out).toContain(part);
    }
    expect(out).toMatch(/<mark[^>]*style="background-color:#fde68a/);
  });

  it("removes anything that can run script or load from elsewhere", () => {
    const out = sanitizeRichText(
      '<p onclick="x()">a<script>alert(1)</script><a href="javascript:alert(1)">l</a><span style="color: red; background: url(https://evil.example)">s</span><span style="position:fixed">p</span></p><img src="http://insecure.example/a.png"><iframe src="https://x.example"></iframe><p data-type="evil">z</p>',
    );
    expect(out).not.toMatch(/onclick|<script|javascript:|url\(|position|<iframe|http:\/\/insecure|data-type="evil"/);
    expect(out).toContain("<p>z</p>");
  });

  it("allows only light formatting in short fields", () => {
    const out = sanitizeShortRichText('<h2>Big</h2><p><strong>b</strong></p><img src="https://cdn.example.org/a.png"><table><tr><td>t</td></tr></table>');
    expect(out).toContain("<p>Big</p>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).not.toMatch(/<h2|<img|<table/);
  });
});

describe("richText fields", () => {
  it("converts plain text, escaping it, and sanitises HTML", () => {
    expect(richText(100).parse("Line one\nline two\n\n- a\n- b")).toBe("<p>Line one<br />line two</p><ul><li>a</li><li>b</li></ul>");
    expect(richText(100).parse("<b>not html</b> text")).toBe("<p>&lt;b&gt;not html&lt;/b&gt; text</p>");
    expect(richText(100).parse('<p>ok<script>x()</script></p>')).toBe("<p>ok</p>");
    expect(richText(100).parse("<p></p>")).toBe("");
  });

  it("counts visible characters, not tags", () => {
    expect(() => richText(10).parse(`<p><strong>${"a".repeat(10)}</strong></p>`)).not.toThrow();
    expect(() => richText(10).parse(`<p>${"a".repeat(11)}</p>`)).toThrow(/10 characters or fewer/);
    expect(() => richText(100, 10).parse("<p><em>short</em></p>")).toThrow(/at least 10/);
  });

  it("turns rich text back into plain text for emails and metadata", () => {
    const html = "<p>Hello &amp; <strong>welcome</strong></p><ul><li><p>one</p></li><li><p>two</p></li></ul>";
    expect(isRichHtml(html)).toBe(true);
    expect(isRichHtml("Hello")).toBe(false);
    expect(richToPlainText(html)).toBe("Hello & welcome\n• one\n• two");
    expect(richExcerpt(`<p>${"word ".repeat(60)}</p>`, 50).endsWith("…")).toBe(true);
  });
});
