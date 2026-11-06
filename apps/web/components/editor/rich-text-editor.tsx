"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Popover } from "radix-ui";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  ChevronDown,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { isRichHtml, textToRichHtml } from "@ritechs/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type EditorVariant = "full" | "short";

export interface RichTextEditorProps {
  /** id of the editable area (the label points at it; focusFirstError focuses it). */
  id: string;
  labelId: string;
  describedBy?: string;
  value: string;
  onChange: (html: string) => void;
  variant?: EditorVariant;
  /** Approximate height of the writing area, in text lines. */
  rows?: number;
  invalid?: boolean;
  placeholder?: string;
  /** Upload an image and return its URL; shows the image button (full editor only). */
  onUploadImage?: (file: File) => Promise<string>;
}

/** Text colours and highlights: readable on white, in step with the site palette. */
const TEXT_COLOURS: [string, string | null][] = [
  ["Default", null],
  ["Slate", "#33404f"],
  ["Orange", "#c2410c"],
  ["Red", "#b91c1c"],
  ["Green", "#15803d"],
  ["Blue", "#1d4ed8"],
  ["Purple", "#7e22ce"],
  ["Grey", "#6b7280"],
];
const HIGHLIGHTS: [string, string | null][] = [
  ["None", null],
  ["Yellow", "#fef08a"],
  ["Orange", "#fed7aa"],
  ["Green", "#bbf7d0"],
  ["Blue", "#bfdbfe"],
  ["Pink", "#fbcfe8"],
  ["Grey", "#e5e7eb"],
];

const toEditorHtml = (v: string) => (!v ? "" : isRichHtml(v) ? v : textToRichHtml(v));
const isEmpty = (e: Editor) => e.isEmpty && !e.getHTML().includes("<img");

/**
 * The dashboards' rich text editor (Tiptap): a Google-Docs-like toolbar over a
 * writing area that looks like the published text. "short" keeps to light
 * formatting for summaries and messages. Emits sanitisable HTML, "" when empty.
 */
export default function RichTextEditor({ id, labelId, describedBy, value, onChange, variant = "full", rows = 6, invalid, placeholder, onUploadImage }: RichTextEditorProps) {
  const full = variant === "full";
  const lastEmitted = useRef<string>(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: full ? { levels: [2, 3] } : false,
        blockquote: full ? {} : false,
        codeBlock: false,
        code: false,
        horizontalRule: full ? {} : false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null } },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      ...(full ? [TextAlign.configure({ types: ["heading", "paragraph"] }), Image.configure({ inline: false })] : []),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: cn("rich-content rich-editor-area max-w-none px-4 py-3 outline-none", !full && "rich-content-compact"),
        style: `min-height: ${Math.max(rows, 2) * 1.75 + 1.5}rem`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = isEmpty(e) ? "" : e.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Keep in step when the form loads or resets the value from outside.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    if (invalid) dom.setAttribute("aria-invalid", "true");
    else dom.removeAttribute("aria-invalid");
  }, [editor, invalid]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-surface transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      {editor ? <Toolbar editor={editor} full={full} onUploadImage={full ? onUploadImage : undefined} /> : <div className="h-11 border-b border-rule bg-paper" />}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="px-4 py-3" style={{ minHeight: `${Math.max(rows, 2) * 1.75 + 1.5}rem` }}>
          <Spinner className="size-4 text-faint-ink" />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── toolbar ─────────────────────────── */

function Tool({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded text-ink/80 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-35 md:size-8",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand [&_svg]:size-[1.0625rem]",
        active && "bg-brand-wash text-brand hover:bg-brand-wash hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}

/** After a toolbar menu closes, keep typing where you were instead of on the menu button. */
function backToText(e: Event, editor: Editor) {
  e.preventDefault();
  editor.commands.focus();
}

const Sep = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-rule" />;

function Toolbar({ editor, full, onUploadImage }: { editor: Editor; full: boolean; onUploadImage?: (file: File) => Promise<string> }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      quote: e.isActive("blockquote"),
      align: ((["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left") as "left" | "center" | "right" | "justify",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (e.getAttributes("highlight").color as string | undefined) ?? null,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canSink: e.can().sinkListItem("listItem") || e.can().sinkListItem("taskItem"),
      canLift: e.can().liftListItem("listItem") || e.can().liftListItem("taskItem"),
    }),
  });
  const chain = () => editor.chain().focus();
  const style = s.h2 ? "h2" : s.h3 ? "h3" : s.quote ? "quote" : "p";
  const AlignIcon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[s.align];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      className="flex items-center gap-0.5 overflow-x-auto border-b border-rule bg-paper px-1.5 py-1 [scrollbar-width:thin] md:flex-wrap md:overflow-visible"
    >
      <Tool label="Undo" shortcut="Ctrl+Z" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 aria-hidden />
      </Tool>
      <Tool label="Redo" shortcut="Ctrl+Y" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 aria-hidden />
      </Tool>
      <Sep />

      {full && (
        <>
          <label className="sr-only" htmlFor={`${editor.view.dom.id}-style`}>
            Text style
          </label>
          <select
            id={`${editor.view.dom.id}-style`}
            value={style}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") chain().setParagraph().run();
              else if (v === "quote") chain().setParagraph().setBlockquote().run();
              else chain().setHeading({ level: v === "h2" ? 2 : 3 }).run();
            }}
            className="h-11 shrink-0 rounded border-0 bg-transparent pr-7 pl-2 text-sm text-ink hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-brand md:h-8"
          >
            <option value="p">Normal text</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
            <option value="quote">Quote</option>
          </select>
          <Sep />
        </>
      )}

      <Tool label="Bold" shortcut="Ctrl+B" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold aria-hidden />
      </Tool>
      <Tool label="Italic" shortcut="Ctrl+I" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic aria-hidden />
      </Tool>
      <Tool label="Underline" shortcut="Ctrl+U" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline aria-hidden />
      </Tool>
      {full && (
        <Tool label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough aria-hidden />
        </Tool>
      )}
      <Swatches
        editor={editor}
        label="Text colour"
        icon={<Baseline aria-hidden />}
        bar={s.color ?? "var(--ink)"}
        options={TEXT_COLOURS}
        current={s.color}
        onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())}
      />
      <Swatches
        editor={editor}
        label="Highlight"
        icon={<Highlighter aria-hidden />}
        bar={s.highlight ?? "transparent"}
        options={HIGHLIGHTS}
        current={s.highlight}
        onPick={(c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run())}
      />
      <Sep />

      <LinkTool editor={editor} active={s.link} />
      {full && onUploadImage && <ImageTool editor={editor} upload={onUploadImage} />}
      {full && (
        <>
          <Sep />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                title="Align"
                aria-label={`Align: ${s.align}`}
                onMouseDown={(e) => e.preventDefault()}
                className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded px-2 text-ink/80 hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-brand md:h-8 [&_svg]:size-[1.0625rem]"
              >
                <AlignIcon aria-hidden />
                <ChevronDown className="!size-3" aria-hidden />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content sideOffset={4} align="start" onCloseAutoFocus={(e) => backToText(e, editor)} className="z-50 flex gap-0.5 rounded-md border border-rule bg-surface p-1 shadow-lg">
                {(
                  [
                    ["left", "Align left", AlignLeft],
                    ["center", "Align centre", AlignCenter],
                    ["right", "Align right", AlignRight],
                    ["justify", "Justify", AlignJustify],
                  ] as const
                ).map(([a, label, Icon]) => (
                  <Popover.Close asChild key={a}>
                    <Tool label={label} active={s.align === a} onClick={() => chain().setTextAlign(a).run()}>
                      <Icon aria-hidden />
                    </Tool>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </>
      )}
      <Sep />

      {full && (
        <Tool label="Checklist" active={s.task} onClick={() => chain().toggleTaskList().run()}>
          <ListChecks aria-hidden />
        </Tool>
      )}
      <Tool label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List aria-hidden />
      </Tool>
      <Tool label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered aria-hidden />
      </Tool>
      {full && (
        <>
          <Tool
            label="Decrease indent"
            disabled={!s.canLift}
            onClick={() => (editor.can().liftListItem("taskItem") ? chain().liftListItem("taskItem").run() : chain().liftListItem("listItem").run())}
          >
            <IndentDecrease aria-hidden />
          </Tool>
          <Tool
            label="Increase indent"
            disabled={!s.canSink}
            onClick={() => (editor.can().sinkListItem("taskItem") ? chain().sinkListItem("taskItem").run() : chain().sinkListItem("listItem").run())}
          >
            <IndentIncrease aria-hidden />
          </Tool>
        </>
      )}
      <Sep />
      <Tool label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting aria-hidden />
      </Tool>
    </div>
  );
}

function Swatches({
  editor,
  label,
  icon,
  bar,
  options,
  current,
  onPick,
}: {
  editor: Editor;
  label: string;
  icon: React.ReactNode;
  bar: string;
  options: [string, string | null][];
  current: string | null;
  onPick: (c: string | null) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          className="relative inline-flex size-11 shrink-0 flex-col items-center justify-center rounded text-ink/80 hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-brand md:size-8 [&_svg]:size-[1.0625rem]"
        >
          {icon}
          <span aria-hidden className="mt-0.5 h-[3px] w-4 rounded-full border border-ink/15" style={{ background: bar }} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="start" onCloseAutoFocus={(e) => backToText(e, editor)} className="z-50 w-56 rounded-md border border-rule bg-surface p-2 shadow-lg">
          <p className="px-1 pb-1.5 text-xs font-medium text-muted-ink">{label}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {options.map(([name, c]) => (
              <Popover.Close asChild key={name}>
                <button
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={(current ?? null) === c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(c)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded border text-xs focus-visible:outline-2 focus-visible:outline-brand",
                    (current ?? null) === c ? "border-brand ring-2 ring-brand/30" : "border-rule hover:border-rule-strong",
                  )}
                  style={c ? { background: label === "Highlight" ? c : undefined, color: label === "Highlight" ? undefined : c } : undefined}
                >
                  {c ? (label === "Highlight" ? "" : "A") : name}
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LinkTool({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const apply = () => {
    let v = url.trim();
    if (!v) return setError("Enter a web address.");
    if (/^www\./i.test(v) || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(v)) v = `https://${v}`;
    if (!/^(https?:\/\/[^\s]+\.[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(v)) return setError("Use a full address such as https://example.org.");
    const { empty } = editor.state.selection;
    if (empty && !active) editor.chain().focus().insertContent({ type: "text", text: v, marks: [{ type: "link", attrs: { href: v } }] }).run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
          setError("");
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Link (Ctrl+K)"
          aria-label="Link"
          aria-pressed={active}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded text-ink/80 hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-brand md:size-8 [&_svg]:size-[1.0625rem]",
            active && "bg-brand-wash text-brand",
          )}
        >
          <Link2 aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="start" onCloseAutoFocus={(e) => backToText(e, editor)} className="z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-rule bg-surface p-3 shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <label htmlFor={`${editor.view.dom.id}-link`} className="text-sm font-medium text-ink">
              Link address
            </label>
            <input
              id={`${editor.view.dom.id}-link`}
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              placeholder="https://example.org…"
              aria-invalid={!!error || undefined}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:border-brand focus-visible:outline-none"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              {active && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                    setOpen(false);
                  }}
                >
                  <Unlink aria-hidden /> Remove
                </Button>
              )}
              <Button type="submit" size="sm">
                Apply
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ImageTool({ editor, upload }: { editor: Editor; upload: (file: File) => Promise<string> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Tool label={busy ? "Uploading image…" : "Insert image"} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Spinner className="size-4" /> : <ImagePlus aria-hidden />}
      </Tool>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 8 * 1024 * 1024) return setError("Images must be 8 MB or smaller.");
          setBusy(true);
          setError("");
          try {
            const src = await upload(file);
            editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") }).run();
          } catch (err) {
            setError(err instanceof Error ? err.message : "The image could not be uploaded.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && (
        <span role="alert" className="shrink-0 px-1 text-xs text-destructive">
          {error}
        </span>
      )}
    </>
  );
}
