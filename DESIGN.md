# Hamlett Visuals — Design System

The token layer that every section is built on. Source of truth lives in
`src/app/globals.css` (`@theme` + `@layer base/components`); fonts are wired in
`src/app/layout.tsx`; the signature photo interaction is
`src/components/HoverZoomImage.tsx` + the `.hover-zoom` CSS.

This document is the *why*. It also carries the guardrails from the two design
reviews (ui-ux-pro-max, frontend-design) so section work doesn't drift back
toward generic defaults.

---

## The one idea

The interface is a **recessive gallery wall**. Warm off-white ground, warm
near-black text, one hairline for structure, one taupe accent used almost
nowhere. The photographs are the only source of colour and the only thing that
moves (plus one hover). Every decision below serves that: the UI gets quieter so
the work gets louder.

Spend the boldness in exactly one place — **Fraunces at hero scale**.

---

## Color

| Token | Value | Role | Notes |
|---|---|---|---|
| `--color-canvas` | `#FAF9F6` | Page ground | Warm off-white. Near-white, *not* a saturated cream. |
| `--color-canvas-tint` | `color-mix(in srgb, --color-accent 9%, --color-canvas)` | Tinted ground | Derived, **never a standalone hex** — canvas with a 9% wash of the taupe accent. A barely-there warm shift used as the background on exactly three sections: About, the Hot offer section, and the footer. Every other section stays on plain `--color-canvas`. |
| `--color-ink` | `#171614` | Primary text | Warm near-black. The warm cast is matched to the canvas on purpose — pure `#000` reads as detached here. ~17:1 on canvas. |
| `--color-muted` | `#5F5B52` | Secondary / caption text | 6.3:1 on canvas — AA for all sizes. |
| `--color-accent` | `#8A8378` | Taupe accent | **3.5:1 on canvas — fails AA for body text.** Use for decoration and large display type only: underline tint on hover, active-state marks, selection highlight. Never as the colour of small text or a small-text link. |
| `--color-accent-text` | `#71654F` | Accent, as text | Same hue as `--color-accent`, pulled darker to **5.4:1 on canvas — AA for all sizes.** For accent-coloured *text* below large-display size (the featured offer's price figure and list-row title). |
| `--color-hairline` | `#D8D5CC` | 1px dividers | The only structural line on the site. Between top-level sections only. |
| `--color-btn` / `--color-btn-ink` | `#171614` / `#FAF9F6` | Button fill / label | Inverted, not accent-coloured. |

Tailwind utilities: `bg-canvas`, `text-ink`, `text-muted`, `text-accent`,
`border-hairline`, `bg-ink`, etc. Raw `var(--color-*)` also available for
hand-written CSS. Tailwind's default palette (zinc/slate/…) still resolves —
it's only there for the un-migrated placeholder scaffold; **do not use it in new
work.**

### Links (contrast fix)

Because taupe fails AA at body size, links do **not** use accent as their text
colour. `.link` renders ink text (full contrast) with a 1px hairline underline
that warms to taupe on hover. The accent only ever tints decoration.

`.link-quiet` is the exception for links that wrap a whole heading (the offer
titles): plain text, hairline underline on hover / focus only, so the heading
never reads as a control.

---

## Typography

Two families, clearly distinct. No third typeface. No italic as a default.

| | Family | Weights | Used for |
|---|---|---|---|
| Display | **Fraunces** (variable, `opsz` axis on) | 400 hero-scale, 500 everything else | h1–h6, hero headline |
| Text | **Inter** (variable) | 400 body, 500 emphasis + buttons | body, UI, nav, labels, captions |

`font-optical-sizing: auto` is set globally, so Fraunces opens up at hero size
and firms up at heading size without extra work. Headings default to weight 500;
weight 400 is reserved for `.text-hero`-scale type.

### Scale

Fluid; headings scale down on small screens via `clamp()`.

| Token / utility | Size | Line-height | Use |
|---|---|---|---|
| `text-caption` | 13px | 1.5 | meta, counts — sparing |
| `text-body` | 14px | 1.6 | default running text |
| `text-lead` | 16px | 1.65 | intro / lead paragraphs |
| `text-title` | 20px | 1.3 | h3 / h4 |
| `text-heading` | 24 → 32px | 1.15 | section headings (h2) |
| `text-page` | 32 → 44px | 1.1 | page titles (h1) |
| `text-hero` | 44 → 64px | 1.04 | hero display only, weight 400 |

Body 14px is a deliberate editorial choice, below the usual 16px mobile floor.
Carve-out: **all form controls are forced to 16px** (`input, select, textarea`)
so iOS doesn't zoom on focus. Don't set real content below 14px.

`<p>` is capped at `--spacing-measure` (68ch) for a readable line. Override with
`max-w-none` where a layout needs it.

---

## Layout & surfaces

- **Flat only.** No cards, no shadows, no gradients, no border-radius on
  surfaces. Rounded exceptions, all deliberate: the button (`--radius-btn:
  7px`), the link chips (`.link-chip`, full pill radius), the offer badge
  (`.offer-badge`, full pill), the featured offer row (`.offer-row-featured`,
  3px), the Instagram tiles (`--radius-media`, 4px) and the Hot offer card
  (`.hot-offer-card`, 8px — see below). All stay flat otherwise — solid or
  hairline border, no shadow, no gradient.
- **Tinted ground, three sections.** About, the Booking CTA and the footer sit
  on `--color-canvas-tint` instead of plain `--color-canvas` — a faint warm
  wash (9% accent). Every other section, the `#hot-offer` section included,
  stays on plain canvas (the Hot offer *card* is tinted, but its section is
  not — that white-behind-tinted-card contrast is the point).
- **One card-like surface, scoped.** `.offer-row-featured` is the single
  bordered box in the Offers & pricing list: a 1px `--color-accent-text`
  border (the same darker accent that fills the solid Book pill) around the one
  featured offer, to lift it out of the plain hairline-divided rows. No fill.
  It carries a faint accent glow at rest and a scoped hover-lift (next bullet).
  Do not generalise it to other rows or sections.
- **The Hot offer card — a scoped static shadow.** The standalone `#hot-offer`
  section holds one `.hot-offer-card`, kept deliberately compact: badge, title,
  price, a one-line summary and the two action pills in a narrow left column,
  with a wide gallery-thumbnail row filling the card to the right edge. The
  full inclusions list and fine print are NOT duplicated here — they live only
  in this offer's repeat row in the Offers list, behind its Show details
  toggle. The card has a `--color-canvas-tint` fill that contrasts against the
  plain-canvas section behind it, an 8px radius, and a soft blurred
  accent-tinted halo — two low-opacity `color-mix` `box-shadow` layers, no
  grey, no motion. **No border** — per the reference, the tint plus the halo
  alone read as the card edge, deliberately softer than the repeated "Hot
  deal" row's own solid `--color-accent-text` border (unchanged). A
  **deliberate, explicitly scoped exception to the no-shadow rule**: this one
  card only. It does not license shadows anywhere else.
- **The "Hot deal" row hover-lift — a second scoped exception, motion + shadow.**
  `.offer-row-featured` — the repeat of the featured offer inside the Offers &
  pricing list, and *only* that row (not the standalone `.hot-offer-card`, not
  the Terms box) — carries a faint accent glow at rest and, on a fine pointer,
  lifts `translateY(-3px)` with the glow growing wider and stronger on hover
  (180ms `--ease-standard`) — the card rising off the page. Distinct from the
  Hot offer card's *static* halo. Under `prefers-reduced-motion` the transform
  and transition are dropped; the glow may still change on hover, just with no
  lift and no ease. Scoped to this one row — not a licence for hover-lift or
  shadows elsewhere.
- **The "Hot deal" badge-on-border — a third scoped exception, a plain neutral
  shadow.** On `.offer-row-featured` only, the "Hot deal" `<OfferBadge>` is
  absolutely positioned (the row is its positioned ancestor) so it straddles
  the row's top border instead of sitting in its padding — `top-0
  -translate-y-1/2`, left-aligned with the row's own padding. It carries its
  own small `--color-ink`-tinted drop shadow (`.offer-badge-on-border`, ~20%
  opacity) — a **plain neutral shadow, not accent-coloured**, unlike the other
  two exceptions above. It is static: the badge does not grow or animate on
  its own, and is not grown by the row's hover-lift — it only travels with the
  row because it's positioned relative to it. Badge fill/colours are
  unchanged. Scoped to this one badge; does not touch the standalone Hot offer
  card's badge, and is not a licence for shadows on `.offer-badge` generally.
- **Softened photo corners, scoped.** The `#instagram` grid — and only that
  grid — rounds its tiles by `--radius-media` (4px), a small nod to the
  Instagram app's own rounded thumbnails. It stays flat in every other respect:
  no shadow, no border, same hover-zoom as everywhere else. Category tiles,
  gallery grids and every other `<HoverZoomImage>` frame keep sharp corners —
  this is not a licence to round photo frames site-wide.
- **Hairline dividers** (`border-hairline`, 1px) separate *top-level sections*
  only — never as intra-section decoration, never as vertical column rules. One
  sanctioned in-section use: row rules between the Offers & pricing entries,
  where they encode real item boundaries in a list (not decoration).
- **Generous vertical rhythm.** `--spacing-section` (`p-section` /
  `py-section`) = `clamp(4rem, …, 8rem)` between sections. Side gutter
  `--spacing-gutter` = `clamp(1.25rem, …, 2.5rem)`.
- Opt-in helpers: `.section` (adds `padding-block: var(--spacing-section)`) and
  `.section + .section` (adds the top hairline).
- **Content column.** Every top-level section — plus the header — caps its
  content at `max-w-7xl` (80rem / 1280px), `mx-auto`, so the whole page shares
  one left/right edge on a wide monitor and there are no oversized dead margins
  at ~1920px. Sections use the `px-gutter` side gutter; the header keeps its
  fixed `px-6`. Running text inside still narrows to `--spacing-measure`
  (68ch). Two deliberate narrower columns: the Booking CTA (`max-w-2xl`) reads
  as the quiet centred break between the full-width sections, and the footer
  (`max-w-md`, centred) is a single stacked closing column rather than a
  full-width band.

### Buttons

`.btn` — solid `--color-btn` fill, `--color-btn-ink` label, 1px same-colour
border, 7px radius, no gradient, no shadow. Hover is a bare `opacity: 0.88`
nudge (state feedback, not decoration); `:active` `0.78`.

### Link chips

`.link-chip` — the pill links stacked under the About bio (Backstage,
Testimonials). Flat surface: 1px `--color-hairline` border, full pill radius,
no fill, no shadow, no gradient. Grid of `icon / (small-caps label + title) /
arrow`. Hover (and `:focus-visible`) warms the border hairline → accent, the
same move `.link` makes on its underline; nothing translates or lifts. The
small-caps label and the trailing arrow are scoped to this component — they are
not licence to reintroduce tracked-out eyebrow labels or `→`-suffixed links
elsewhere.

`.link-chip-inline` — compact variant (`icon + label`, no small-caps eyebrow,
no arrow, sized to content) so a pair sits side by side. Used for the
`View gallery` / `Book` actions on the Featured offer and every offer row, and
for the `Show / Hide details` toggle (a `<button>`, UA skin stripped by
`button.link-chip`; its chevron rotates 180° on `aria-expanded` — part of the
disclosure reveal, not a new motion). Same border, radius and hover as
`.link-chip`.

### Offer badge & featured price

`.offer-badge` — a solid `--color-accent` dot + a small-caps label on a faint
accent tint (`color-mix`, ~16%). The site's only accent-tinted surface; kept
tiny and used only on the one featured offer ("Hot offer" on its section, "Hot
deal" on its list row). The label text carries the meaning — colour only
reinforces it.

**Featured accent text.** The featured offer's title and price render in an
accent colour in both places (standalone section and list row). Two tokens:
`--color-accent` (~3.5:1) is used only for the standalone title at `text-page`
size, where 3:1 large-text AA applies. Everything smaller — the price figure
(`text-title`) and the list-row title — uses `--color-accent-text` (`#71654f`,
same hue pulled darker to ~5.4:1), which clears AA for normal text. The small
"From" caption stays `--color-muted`.

`OfferTerms` — the placeholder deposit / cancellation fine print renders as
plain muted caption text. No italic (Inter italic isn't loaded; nothing else
on the site is italic either).

---

## Motion

**Two ambient/hover movements, plus two user-triggered ones (a reveal and one
scoped hover-lift). Nothing else animates.**

1. **Hero image crossfade** — ambient, non-interactive. Token
   `--hero-fade-duration` (1200ms) + `--ease-standard`. (Hero section still to
   be built; when it is, it must also stop rotating under
   `prefers-reduced-motion` and expose a pause control — WCAG auto-rotation.)
2. **Photo hover-zoom** — the site's signature interaction. Every photo
   thumbnail sits in a fixed, `overflow: hidden` frame and the image scales to
   `--zoom-scale` (1.06) over `--zoom-duration` (350ms) `--ease-standard`.
   - Fine pointer only (`@media (hover: hover) and (pointer: fine)`).
   - Disabled under `prefers-reduced-motion`.
   - `transform` only (no width/height); frame reserves space → no CLS.
   - Use `<HoverZoomImage>` or the `.hover-zoom` class. **Do not** add any other
     hover effect (lift, shadow, colour shift) anywhere on the site.
3. **Offer row disclosure** — user-triggered, not ambient. The "Show details"
   toggle on the Offers & pricing rows expands its inclusions via
   `.offer-disclosure` (`grid-template-rows` 0fr → 1fr, 200ms `--ease-standard`,
   short inner fade). Collapsed by default; still under `prefers-reduced-motion`.
   This is the only reveal animation on the site — it does not license
   fade-up-on-scroll or per-card hover transitions elsewhere.
4. **"Hot deal" row hover-lift** — user-triggered, fine-pointer only, scoped to
   `.offer-row-featured` (the featured offer's repeat in the Offers list). On
   hover the row lifts `translateY(-3px)` and its accent glow expands (180ms
   `--ease-standard`) — see Layout & surfaces. Under `prefers-reduced-motion`:
   no transform, no transition (the glow may still snap on hover). This is the
   single sanctioned hover-lift on the site — it does not license per-card
   hover transitions anywhere else, including the standalone `.hot-offer-card`.

No scroll-triggered entrances. No per-section fade-up. `scroll-behavior: smooth`
only when motion is not reduced.

---

## Anti-cliché guardrails (from the reviews)

Checked against frontend-design's known AI-design tells. Present-but-mitigated,
and hard bans:

**Mitigated — keep an eye on these:**
- *Warm off-white + serif display* is AI cluster #1 (cream + serif + clay
  accent). Mitigation: accent is taupe not terracotta, used sparingly; buttons
  inverted not accent-filled; canvas is near-white not cream. The palette's job
  is to disappear — don't compound it with more cluster-1 traits (no clay/rust
  anywhere, no big-serif-quote blocks as decoration).
- *`#171614` tinted near-black* resembles the lazy `#111` chrome tell — kept
  only because the warm cast is deliberately tied to the canvas.
- *Hairline dividers between sections* border on the broadsheet tell — kept
  because they encode real section boundaries on a one-page scroll. Don't extend
  to column rules or dense justified text.

**Banned in all section work:**
- ALL-CAPS tracked-out eyebrow labels above headings.
- Accenting one word/phrase in a heading (colour, italic, or weight).
- `WORD — fragment` labels with a spaced em dash; `A · B · C` middle-dot meta.
- A monospace face for small labels/data (there is no third typeface).
- `→` appended to link or button text.
- Numbered markers (01 / 02 / 03) unless the content is genuinely a sequence.
- Rounded card + soft grey shadow; one border-radius on everything; gradient
  washes as decoration.
- Fade-and-slide-up entrance on every section; hover transitions on every card.

**Three sanctioned exceptions, all scoped and named in Layout & surfaces —
none is a licence for shadows or hover-lifts elsewhere:**
- the Hot offer card's *static* accent-tinted halo (`.hot-offer-card`);
- the "Hot deal" row's hover-lift + growing accent glow (`.offer-row-featured`);
- the "Hot deal" badge's small *static*, `--color-ink`-tinted drop shadow
  (`.offer-badge-on-border`) — the one place a plain neutral (not accent)
  shadow is allowed, because it needs to read against both the card and the
  page it straddles.

Grey card-shadows on any *surface* (cards, rows, sections) stay banned; any
other hover-lift stays banned too.

---

## Migration note

The scaffold sections (Nav, Footer, homepage sections, portfolio pages) still
use placeholder `zinc-*` / `dark:` classes from the routing checkpoint. They
render fine and are replaced token-by-token during the design pass. `PhotoGrid`
and the tile components have an older inline `group-hover:scale-105` treatment —
migrate those to `<HoverZoomImage>` / `.hover-zoom` when their sections are
styled.
