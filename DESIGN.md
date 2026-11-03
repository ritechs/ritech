---
version: alpha
name: RiTECHS
description: The design system of RiTECHS (Research, Innovation, Technology & Solution), an academic research, publication and mentoring organisation. A burgundy-and-white institutional identity built around the supplied RiTECHS logo — deep burgundy for action and emphasis, charcoal text on white, a warm off-white for secondary sections — set in an editorial serif (Newsreader) for headings, titles and abstracts and IBM Plex Sans for interface text. Restrained borders, soft offset shadows, generous whitespace; one burgundy band per page.

colors:
  brand: "#6f263d"
  brand-strong: "#5a1d31"
  brand-deep: "#51172d"
  brand-wash: "#f6edf0"
  brand-tint: "#e8d4da"
  ink: "#202124"
  ink-soft: "#3c4043"
  muted-ink: "#55595e"
  faint-ink: "#686c71"
  surface: "#ffffff"
  paper: "#f7f6f5"
  rule: "#e7e3e4"
  rule-strong: "#cfc8ca"
  on-brand: "#ffffff"
  destructive: "#b42318"
  success: "#1d5e3b"
  success-wash: "#e8f3ec"
  warning: "#7a4a00"
  warning-wash: "#fdf1dc"
  demo: "#6b5214"
  demo-wash: "#fbf6e9"

typography:
  display:
    fontFamily: "Newsreader, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2.375rem, 1.6rem + 3.2vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.018em"
  heading-1:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.012em"
  heading-2:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.375rem, 1.2rem + 0.7vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.35
  abstract:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  identifier:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4

rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"

spacing:
  gutter-mobile: "20px"
  gutter-tablet: "32px"
  gutter-desktop: "40px"
  container: "1280px"
  section-mobile: "64px"
  section-tablet: "80px"
  section-desktop: "96px"
  card-padding: "24px"
  stack-sm: "8px"
  stack-md: "16px"
  stack-lg: "24px"

components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  button-primary-active:
    backgroundColor: "{colors.brand-deep}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.md}"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.brand-wash}"
  button-inverse:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "44px"
  chip-filter-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
  badge-area:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.brand}"
    rounded: "{rounded.sm}"
  badge-demo:
    backgroundColor: "{colors.demo-wash}"
    textColor: "{colors.demo}"
    rounded: "{rounded.sm}"
  band-burgundy:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
---

## Overview

RiTECHS is an academic platform: publications, conferences, mentorship and training. The interface
should read as an established research institution — calm, credible, precise — not as a product
landing page. Two surface modes apply:

- **Read** (publications, abstracts, news): typography leads; long text set in Newsreader at a
  65–75ch measure.
- **Operate** (registration, login, search, filters): clarity and familiar patterns; brand shows in
  precise details, not decoration.

The supplied logo (`public/brand/ritechs-logo-white.png`, white on transparent) is the identity.
On light surfaces use the burgundy recolour of the same artwork (`ritechs-logo.png`). Never stretch,
re-draw, add effects to, or substitute the logo.

## Colors

- **Burgundy `brand` (#6f263d)** is the single brand colour: primary buttons, links, active navigation,
  focus rings, selected filters, icon strokes. It carries meaning; do not use it for large decorative
  fills except the one burgundy band per page (hero visual panel or closing CTA).
- **`brand-deep` (#51172d)** for the closing newsletter band and pressed states.
- **Charcoal `ink` (#202124)** for headings and body; `muted-ink` for secondary text (≥7:1 on white);
  `faint-ink` for metadata (≥5.3:1 on white). Never lighter grey for text.
- **Surfaces** alternate white (`surface`) and warm off-white (`paper`) between sections, separated by
  a 1px `rule` border.
- **Status colours** only for status: `success` / `success-wash` (#1d5e3b on #e8f3ec: open, approved),
  `warning` / `warning-wash` (#7a4b00 on #fdf3e1: limited, pending), `destructive` / `destructive-wash`
  (#b42318 on #fdeceb: rejected, blocked), demo (placeholder content). They never decorate.
- On burgundy surfaces, secondary text is white at 70–85% opacity, not grey.

## Typography

- Newsreader (serif, self-hosted variable font with optical sizes): display, section headings,
  publication and event titles, abstracts, mentor names.
- IBM Plex Sans: navigation, buttons, labels, form fields, metadata, body copy in UI contexts.
- IBM Plex Mono: identifiers only (DOI, ISSN). Never as a "technical" costume.
- Headings use `text-wrap: balance`; titles `text-wrap: pretty`. Abstracts use old-style figures;
  dates and counts use tabular lining figures.
- Title Case for headings and buttons (Chicago style), matching the RiTECHS menu
  ("Mission & Vision", "Explore Publications"). Body copy in sentence case.
- No all-caps labels, no eyebrow/kicker text above headings (the one exception is the brief-mandated
  hero tagline, which is not used in the current hero).

## Layout

- Container max 1280px with 20 / 32 / 40px gutters (mobile / tablet / desktop).
- 12-column grid on desktop; content usually splits 7/5 or 4/8. Single column on mobile, built
  mobile-first — layouts adapt, they do not shrink.
- Section vertical rhythm: 64 / 80 / 96px. More space above a heading than below it.
- Navigation: one sticky white row; full menu with dropdowns from 1280px, slide-out sheet below.

## Elevation & Depth

- Default: flat with 1px `rule` borders.
- Hover on cards: border darkens to `rule-strong` plus a soft offset shadow
  `0 12px 28px -18px rgba(32,33,36,.28)`.
- Overlays (dialogs, dropdowns): `0 20px 44px -20px rgba(32,33,36,.35)`.
- Never hard offset (zero-blur) shadows, glows, glassmorphism, or gradient text.

## Shapes

- Radii: 4px badges, 6px buttons and inputs, 8px cards and panels, 12px auth containers and dialogs,
  full for filter chips, status pills and avatars' monogram rings.
- Borders 1px. Accent rules: a 2px burgundy top rule on service and news columns only. No thick
  coloured left/right borders on cards or alerts.

## Components

- **Buttons**: primary (burgundy), outline (burgundy text, burgundy-tinted border), inverse (white on
  burgundy), ghost (icon buttons). Minimum 44px tall; async actions show a spinner and an ellipsis
  label ("Registering…") while pending, and stay enabled until the request starts.
- **Publication card**: area badge + demo badge, serif title, authors, type/date, venue in italic
  serif, three-line abstract preview, DOI line, "Read Abstract" (dialog) and "View Paper" (page).
- **Event card**: date block, category, title, date/time/location with icons, summary, status pill,
  "View Event Details" (dialog).
- **Forms**: visible labels above fields, 48px inputs, inline errors under the field with the fix
  stated, focus moves to the first error on submit, hints in `faint-ink`.
- **Badges**: area (burgundy wash), demo (dashed amber) — demo badges must appear on every
  placeholder record.
- **Icons**: Lucide, 1.4–1.6 stroke, burgundy or `faint-ink`. No emoji or Unicode glyphs as icons.

## Do's and Don'ts

Do:
- Use the tokens above; add a token rather than a one-off hex value.
- Keep real (verified) content and demo content visibly distinct.
- Give every interactive element hover, focus-visible, active, disabled and loading states.
- Check every page at 375, 768, 1024, 1280 and 1440px wide.

Don't:
- Gradients as decoration, gradient text, purple-to-blue anything.
- Emoji or icon tiles above headings; eyebrow labels; section numbers that aren't a real sequence.
- Disable zoom (`user-scalable=no`, `maximum-scale=1`).
- `transition: all`, or `outline: none` without a focus-visible replacement.
- Invent statistics, DOIs, credentials or partnerships.

## Charts (admin dashboard)

Two validated series colours: `--chart-1` `#9c3a58` (burgundy) and `--chart-2` `#d08a3a` (amber).
Checked with the dataviz palette validator (lightness band, chroma, colour-blind separation ΔE 22).
`--chart-2` is below 3:1 on white, so every chart that uses it has a legend, hover values and a
screen-reader table. Single-series bars use `--chart-1`. Text never takes a series colour.

