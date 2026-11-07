---
description: fuz_css styling — default-reliance, the styling ladder, variables, extraction
---

# CSS Patterns

fuz_css is three parts: **semantic styles** (classless element defaults),
**style variables** (design tokens as CSS custom properties), and optional
**utility classes** generated per-project with only the classes you use.

## Default styling is the baseline

**The single most common mistake is styling elements fuz_css already styles.**
Headings are tiered, form controls share sizing and states, `<code>`/`<pre>`
are mono, `<aside>` is a callout, and **block elements space themselves**:
`p`, `ul`, `ol`, `menu`, `form`, `fieldset`, `table`, `details`, `textarea`,
`select`, `label`, `pre`, `blockquote`, `aside`, `nav`, `legend` each get
`margin-bottom: var(--flow_margin, var(--space_lg))` unless `:last-child` or
`.unstyled` (`section` takes a larger multiple of it). A stack of paragraphs, a heading over prose, a list under a
heading — correct rhythm with **zero classes**.

Before adding any class or `<style>`, ask: _what specific gap in the defaults
does this close?_ Hand-adding `mb_*`/`gap_*`/`p_*` where flow margin already
spaces, or re-declaring the color/font an element carries, fights the
framework. Most fuz app source files have **no `<style>` block**, and where
classes appear it's one or two, not long strings.

Reach past the defaults for genuine layout (flex rows/columns, grids), intent
color (`palette_c` for a destructive button), or component-specific behavior.
Flex containers are the main reason to add classes at all — inside a `.row` or
`.row_wrap`, child flow margins reset to 0 (`.row > *`, `.row_wrap > *` →
`margin: 0`), so use `gap_*` there.

## The Styling Ladder

Stop at the first rung that suffices:

1. **Semantic HTML** — the right element, no class. Often the whole job.
2. **Built-in class conventions** — `.selected`, `.disabled`,
   `.palette_a`–`.palette_j`, `.inline`, `.unstyled` — state/variant classes
   the semantic styles already recognize.
3. **Composite classes** — `box`, `row`, `row_wrap`, `column`, `panel`, `chip`,
   `ellipsis`.
4. **Token and keyword classes** — `p_md`, `gap_lg`, `color_a_50`; never
   hardcode spacing or color. Keyword classes are bare CSS keywords that name
   their property (`flex`, `sticky`, `uppercase`), plus `hidden`
   (`display: none`).
5. **Literal classes** — `justify-content:space-between`, `width:100%`,
   `hover:opacity:80%`.
6. **`<style>` block with design tokens** — component-specific layout,
   animation, complex selectors, theming APIs.

**Rungs 3–5 are one tier**, mixed freely on the same element: a composite when
one _exactly_ matches (`row` over `flex align-items:center`), tokens for
spacing/color, keywords and literals for one-off layout. Spacing tokens are the
most-used family and flex classes (`flex`, `flex:1`, `width:100%`) are as
common as composites. The real cut points are rung 1 vs the rest, and rungs
1–5 vs rung 6. Mixing has one rule: a token, keyword, or literal class beats a
multi-property composite on the same property, modified or not, since
composites render in a lower sublayer. Same for text: `<small>` over
`font-size: var(--font_size_sm)`, `<aside>` over a hand-built callout.
Never hand-write a `rem` font size: fuz_css sets a 62.5% root, so `0.85rem`
renders ~8.5px — smaller than the `--font_size_sm` text around it. Every other
`rem` length in a rule or a container query scales the same way (`16rem` is
160px), but a `@media` query's `rem` is the browser's initial 16px, which is
why the breakpoint modifiers below read `40rem` for 640px. Prefer tokens; when a
hand-written length is unavoidable, pick its unit knowing which of the two it
gets.

### Direction matters — don't churn `<style>` into class soup

The ladder describes how to **author**, not a mandate to rewrite `<style>`
blocks. Pushing styling _up_ (`<div class="callout">` → `<aside>`) is good;
pushing it _down_ (a working `<style>` → a 12-class string) is churn.

- **Trivially-redundant `<style>` → composite/token** — only when the block's
  entire content is one composite's worth
  (`display: flex; flex-direction: column; gap: var(--space_md)` → `column gap_md`)
  and intent survives verbatim.
- **Non-trivial `<style>` → class string** — don't. Hover/focus state machines,
  animations, `@media`, parent-child selectors, pseudo-element content,
  positioning, theming variables all stay in `<style>`, which also gets IDE
  autocomplete and composes with conditional logic without `clsx` gymnastics.

When in doubt, leave an existing `<style>` block alone.

## Elements That Come Pre-Styled

| Element                           | What you get without classes                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `<h1>`–`<h6>`                     | Serif font, tiered sizes/weights, balanced text wrap, flow margins                       |
| `<a>`                             | Link color, focus outline, `.selected` state                                             |
| `<button>`                        | Fill, border, hover/active/focus/disabled/selected states                                |
| `<button class="palette_a">`      | Hue variants `palette_a` through `palette_j` (intent/status colors)                      |
| `<input>`/`<textarea>`/`<select>` | Padding, border, focus outline, hover/disabled states; range, checkbox, radio all styled |
| `<aside>`                         | Left border, tinted background, padding — callout/info box                               |
| `<blockquote>`                    | Thick left border, padding                                                               |
| `<code>`                          | Monospace, tinted background, padding; auto-inlines inside `<p>`                         |
| `<pre>`                           | Monospace, overflow handling                                                             |
| `<details>`/`<summary>`           | Pointer cursor, hover/active backgrounds                                                 |
| `<table>`/`<th>`/`<td>`/`<tr>`    | Border-collapse, header alignment, cell padding, row hover                               |
| `<small>`                         | `font-size: var(--font_size_sm)` — metadata, secondary text                              |
| `<kbd>`/`<samp>`                  | Monospace font                                                                           |
| `<abbr title="...">`              | Dotted underline                                                                         |
| `<sub>`/`<sup>`                   | Baseline-aware sub/superscript                                                           |
| `<hr>`                            | Themed double border with vertical spacing                                               |
| `<img>`/`<svg>`/`<video>` etc.    | `display: block`, `max-width: 100%`, `height: auto`                                      |
| `<ul>`/`<ol>`/`<menu>`            | Indented padding (`.unstyled` removes bullets and indent)                                |
| `<label>`                         | Block layout, cursor pointer, `.selected`/`.disabled` states                             |
| `<label> .title`                  | Bold, small bottom margin — field label inside a `<label>`                               |
| `<fieldset>`/`<legend>`           | Column flex layout, larger legend text                                                   |

Low-specificity `:where()` selectors in `fuz.base`, the lowest of fuz_css's
cascade layers, carry all of this, so utility classes (`fuz.utilities`) and
your unlayered styles override it regardless of import order. The exception
is `[hidden]`, whose `display: none !important` holds.

## Built-In Class Conventions

State/variant classes authored into the semantic styles (`style.css`):

| Class                     | Where it applies                                              | Effect                                                                                                 |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.selected`               | `button`, `a`, `label`, `.menuitem`                           | Filled selected appearance; `button`/`label` also switch to `cursor: default` (links stay interactive) |
| `.deselectable`           | selected `button`, and the `selectable`/`menuitem` composites | Keeps interactivity on a selected element                                                              |
| `.disabled`               | `label`                                                       | Muted color, default cursor                                                                            |
| `.palette_a`–`.palette_j` | `button`                                                      | Palette variants (a=blue·accent, c=red·negative, …)                                                    |
| `.inline`                 | `button`, `input`, `code`, `select`, `textarea`               | Inline-block display inside paragraph text                                                             |
| `.unstyled`               | Most elements                                                 | Opts out of opinionated styling, keeps normalizations                                                  |

`<button class="palette_c selected">` is already a "selected destructive
action". (Size classes `sized_sm`/`sized_md`/`sized_lg` read like conventions
but are composites that require extraction — see
[Composite Classes](#composite-classes).)

## Project Setup

### Import Order

In `src/routes/+layout.svelte`:

```typescript
import 'virtual:fuz.css'; // generated bundled CSS (all projects)
import '@fuzdev/fuz_code/theme.css'; // package-specific themes (if any)
import './style.css'; // project-specific global styles (app projects)
```

Library repos (fuz_css, fuz_ui, gro) omit the project `style.css`; app repos
use all three.

### CSS Generation

The `vite_plugin_fuz_css` Vite plugin generates CSS on demand as the
`virtual:fuz.css` module — no committed `fuz.css`:

```typescript
// vite.config.ts
import { vite_plugin_fuz_css } from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
export default defineConfig({ plugins: [vite_plugin_fuz_css()] });
```

It returns several plugin objects (pass them as is), needs Vite 6+, and goes
after any plugin that rewrites CSS in its `transform` hook.

```typescript
// src/app.d.ts
declare module 'virtual:fuz.css' {
	const css: string;
	export default css;
}
```

HMR works. The default tree-shaken bundled mode needs no options; the dev-only
`prescan` option eagerly scans sources so the first served CSS is complete.
fuz_css itself passes `additional_elements: 'all'`,
`additional_variables: 'all'`, and a computed `additional_classes` list for its
docs demos.

### Project `style.css`

`src/routes/style.css` holds custom element overrides, patterns being
prototyped before upstreaming to fuz_css, and app layout (sidebar widths, nav
heights). Keep it near-empty. When a pattern recurs across an app's components
but isn't general enough for fuz_css, it belongs here (mark `// TODO upstream`
candidates), not repeated per component.

## Style Variables (Design Tokens)

Defined in TypeScript, rendered to CSS; each token has `light` and/or `dark`
values.

### Colors

10 palette hues: `a` (blue · accent), `b` (green · positive), `c` (red ·
negative), `d` (purple), `e` (yellow), `f` (brown · neutral), `g` (pink), `h`
(orange · caution), `i` (cyan · info), `j` (teal).

Semantic intent knobs alias meaning over the letters — `--hue_accent`,
`--hue_positive`, `--hue_negative`, `--hue_caution`, `--hue_info`, plus
`--hue_neutral`/`--neutral_chroma` for surface/text/border tint. Each intent
derives a 13-stop scale (`--accent_00`–`--accent_100`) with text/background
token classes (`positive_50`, `bg_caution_10`) and the palette letters'
border, outline, and shadow twins (`border_positive_50`, `outline_accent_60`,
`shadow_negative_40`) - prefer intent tokens over palette letters when the
color carries meaning. Caveats: intent naming covers the token classes only
(the button/chip rung stays `.palette_a`–`.palette_j`; there is no `.negative`
button class), and the neutral has no `neutral_00`–`neutral_100` family (its
scales are `shade_*`/`text_*`).

**Intensity scale**: 13 scheme-adaptive stops `00`, `05`, `10`, `20`, `30`,
`40`, `50`, `60`, `70`, `80`, `90`, `95`, `100`. Variables run
`--palette_a_00` (nearest the background) → `_50` (base) → `_100` (highest
contrast); token classes are `color_a_00`–`color_a_100` — property-first, the
letter implies the palette.

### Color-Scheme Variants

| Prefix      | Behavior                                             | Use case                       |
| ----------- | ---------------------------------------------------- | ------------------------------ |
| `text_*`    | Opaque, scheme-aware (low=subtle, high=bold)         | Text (alpha hurts performance) |
| `shade_*`   | Opaque, tinted neutrals (00→100), scheme-aware       | Backgrounds, surfaces          |
| `ink_*`     | Toward the text color (darkens light, lightens dark) | Foreground overlays that stack |
| `paper_*`   | Toward the ground (lightens light, darkens dark)     | Background overlays that stack |
| `darken_*`  | Always darkens (agnostic, alpha-based)               | Shadows, backdrops             |
| `lighten_*` | Always lightens (agnostic, alpha-based)              | Highlights                     |

These are **variable** families. `text_*` and `shade_*` are the everyday opaque
tokens — reach for them first; `ink_*`/`paper_*` overlays use alpha and
accumulate when nested. `text_*`, `shade_*`, `darken_*`, `lighten_*` exist as
classes too, but `ink_*`/`paper_*` have no token classes (the `bg_` class prefix
is the _opaque_ backgrounds, `bg_a_50`, `bg_positive_50`), so reach the adaptive
overlays via literals (`background-color:var(--ink_10)`). `shade_*` and `text_*`
have `_min`/`_max` for untinted extremes. For a color that doesn't adapt to the
scheme, write the literal or define a custom property (the old `_light`/`_dark`
variants were removed).

### Sizes

Spacing: `xs5` → … → `xs` → `sm` → `md` → `lg` → `xl` → `xl2` → … → `xl15`
(23 stops). Subsets: font sizes 13 (`xs`–`xl9`); icon sizes 7 (`xs`–`xl3`,
px); border radii 7 (`xs3`–`xl`); distances 5 (`xs`–`xl`, px absolute widths
200/320/800/1200/1600); shadows and line heights 5 (`xs`–`xl`).

### Additional Variable Families

- `border_color_*` — alpha-based tinted borders (00–100). `outline_shade_*` is
  a class family over the opaque shade scale (it reads `--shade_NN`); there is
  no `--outline_shade_NN` variable
- `shadow_alpha_*` (00–100), `border_width_*` (1–9 px), `duration_*` (1–6,
  0.08s–3s), `hue_*` (`hue_a`–`hue_j` base hues, OKLCH angles)

### Cascade Layers

`fuz.base` (default variables + element styles) < `fuz.preferences` (OS
preference mappings — `prefers-reduced-motion` zeroing durations,
`prefers-contrast: more` bending lightness curves) < `fuz.theme` (theme
overrides, where `render_theme_style()` renders) < `fuz.utilities` (generated
classes). Consumers' unlayered styles beat everything except two `!important`
declarations: `[hidden]`'s `display: none` and the `prefers-reduced-motion`
reset of the `duration_*` tokens (set a duration on the element that needs
one). Colors are derived
OKLCH (curve knobs → ramp stops → color stops, computed in pure CSS).

### Cascading Variable Pattern

Many token classes set a CSS property **and** a cascading custom property so
children inherit: `font_size_lg` → `font-size` + `--font_size`; `icon_size_sm`
→ `font-size` + `--font_size` + `--icon_size`; `color_a_50`
→ `color` + `--text_color`; `border_color_30` → `--border_color`;
`outline_a_50` → `--outline_color` (focus rings key off it);
`shadow_color_umbra` → `--shadow_color`.

## Utility Classes

| Type                  | Example                                     | Purpose                             |
| --------------------- | ------------------------------------------- | ----------------------------------- |
| **Token classes**     | `.p_md`, `.color_a_50`, `.gap_lg`           | Map to style variables              |
| **Keyword classes**   | `.flex`, `.sticky`, `.uppercase`, `.hidden` | A CSS keyword sets its one property |
| **Composite classes** | `.box`, `.row`, `.ellipsis`                 | Multi-property shortcuts            |
| **Literal classes**   | `.align-items:center`, `.hover:opacity:80%` | Arbitrary CSS property:value        |

### Token Classes

- **Spacing**: `p_md`, `px_lg`, `mt_xl`, `gap_sm`, `gap_0`, `mx_auto`, `m_0` —
  the most-used family
- **Text colors**: `text_70`, `text_min`, `color_a_50`
- **Backgrounds**: `shade_00`, `darken_30`, `bg_a_50` (opaque)
- **Typography**: `font_size_lg`, `font_family_mono`, `line_height_md`, `icon_size_sm`
- **Layout**: the **distance-scale** sizers
  `width_atmost_lg`/`width_atleast_sm`/`height_atmost_md` - emit
  `width: 100%; max-width: var(--distance_*)` (px caps 200–1600); space-scale
  sizes and offsets are literals (`width:var(--space_md)`,
  `top:var(--space_sm)`)
- **Borders**: `border_radius_xs`, `border_radius_0`, `border_width_2`,
  `border_color_30`
- **Shadows**: `shadow_md`, `shadow_top_md`, `shadow_inset_xs`,
  `shadow_alpha_50`, `shadow_color_umbra` (also `_highlight`, `_glow`, `_shroud`)

### Keyword Classes

A CSS value keyword that names its property on its own is a bare class setting
that one declaration; a keyword shared across properties (`center`, `nowrap`,
`none`) stays a literal (`align-items:center`).

A class name earns its place by one of: passing that keyword gate, bundling
declarations (a composite), being token-backed, or completing a token family's
steps (`gap_0`, `border_radius_0`). A single non-token declaration never gets a
coined name - the literal is the shorthand (`flex:1`, `width:100%`,
`border-radius:50%`, `white-space:nowrap`). `hidden` is the one named
exception: it mirrors the HTML attribute so modifiers can reach it.

- **display**: `flex`, `inline-flex`, `grid`, `inline-grid`, `inline-block`,
  `block`, `flow-root`
- **position**: `relative`, `absolute`, `fixed`, `sticky`
- **typography**: `uppercase`, `lowercase`, `capitalize`, `italic`,
  `oblique`, `bold`, `bolder`, `lighter`, `underline`, `overline`,
  `line-through` (the decoration ones set the `text-decoration-line` longhand)
- **rendering**: `pixelated` (`image-rendering`)
- **`hidden`**: `display: none`, mirroring the HTML attribute

They order with the token and literal classes and take modifiers like any
class (`md:flex`, `hover:underline`). `flex` is plain `display: flex`; `row`,
`column`, and `box` stay the composites that add direction and alignment.

`hidden` exists for the modifiers the attribute can't take (`max-md:hidden`,
`print:hidden`); static hiding is the `hidden` attribute's job, and the
attribute beats every class; the class itself loses to a `display` set in a
component `<style>` block. The class orders after a `display:*` literal it
ties with, so it toggles in a class list, while a media query still outranks
it:

```svelte
<div class={['flex', {hidden: !open}]}>         <!-- toggled: hidden wins -->
<nav class="max-md:hidden row">                   <!-- hidden below md, a row from md up -->
<nav class="hidden md:flex">                      <!-- hidden until md, then flex -->
```

**Trap**: `hidden md:row` stays hidden at every width — the composite `row`
sits in the lower sublayer, so even modified it loses to `hidden`. Put the
modifier on the single-purpose class: `max-md:hidden row`.

Keyword classes are found implicitly like any class, so a component-local
class named like one (`.hidden`, `.block`, `.bold`) also gets fuz_css's
declaration — name local classes in `kebab-case` that no keyword takes.

### Composite Classes

| Class                 | What it does                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `box`                 | Flex column, items centered, justify centered                                                                    |
| `row`                 | Flex row, align-items centered (overrides `box` direction)                                                       |
| `column`              | Flex column (like `box` but uncentered)                                                                          |
| `panel`               | Embedded container with tinted background and border-radius                                                      |
| `pane`                | Floating container with opaque background and shadow                                                             |
| `ellipsis`            | Block with text truncation (nowrap, overflow hidden, ellipsis)                                                   |
| `chip`                | Inline label styling (font/padding/bg/radius + `palette_X` hues); display comes from the host element            |
| `menuitem`            | Full-width list item with selected state; its children are `menuitem_content`, `menuitem_icon`, `menuitem_title` |
| `icon_button`         | Square button sized to `--input_height` (flex-shrink: 0)                                                         |
| `selectable`          | Button-like fill with hover/active/selected states                                                               |
| `clickable`           | Hover/focus/active scale transform effects (includes state styles)                                               |
| `plain`               | Transparent border/fill/shadow on unselected elements; fill and shadow return on hover                           |
| `chevron`             | Small right-pointing arrow via CSS border trick                                                                  |
| `row_wrap`            | A `row` that wraps; children get the same flow-margin reset                                                      |
| `sr_only`             | Visually hidden, still read by assistive technology                                                              |
| `sized_xs`–`sized_xl` | **Size composites** — see below                                                                                  |
| `mb_flow`/`mt_flow`   | Flow-aware margin that follows `--flow_margin` (size composites)                                                 |

**Size composites cascade to a subtree.** Put one on any **container** (or a
single element, such as a row of secondary buttons) and it
rescales that subtree's `--font_size`, `--input_height`, `--icon_size`,
padding, **and `--flow_margin`** in lockstep — a `sized_sm` panel gets tighter
controls, chips, icons, and rhythm together (headings and prose keep their
sizes — each `hN` re-sets `--font_size` on itself, body text never reads it).
`sized_md` resets to default inside an already-sized parent. This is how to
make a whole region denser or roomier.

**Gotcha**: composites with rulesets (`clickable`, `selectable`, `menuitem`,
`plain`, `chip`) already include their state styles — `hover:clickable` is
redundant.

The load-bearing composites are `row`, `column`, `box`, `panel`, `chip`,
`menuitem`; `pane` and `chevron` see near-zero real use.

### Literal Classes

`property:value` maps directly to CSS. `~` encodes spaces in multi-value
properties; `calc` needs `~` around `+`/`-`:

```svelte
<div class="flex justify-content:center gap:var(--space_md)">
<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)">
<div class="width:calc(100%~-~20px)">
```

More than 2–3 `~` → use a `<style>` block. Custom-property literals
(`--flow_margin:0`, `--button_shadow:none`, `--button_min_height:0` for a
button shorter than the input height) are the general escape hatch onto
any theme/base variable hook (knobs like `--space_scale` resolve on `:root`,
so they belong in a theme, not on an element).

## Modifiers

Prefixes on any class, each 1:1 with a pseudo-class or at-rule
(`hover:` → `:hover`, `disabled:` → `:disabled`, `print:` → `@media print`,
`before:` → `::before`); the exhaustive registry is fuz_css's `modifiers.ts`.

```svelte
<button class="hover:opacity:80% focus:outline:2px~solid~var(--palette_a_50)">
<div class="hidden md:flex">                        <!-- responsive -->
<div class="box-shadow:var(--shadow_lg) dark:box-shadow:var(--shadow_sm)">
<div class='before:content:"" before:display:block'> <!-- pseudo needs explicit content -->
```

- **Breakpoints**: `sm:` (40rem), `md:` (48rem), `lg:` (64rem), `xl:` (80rem),
  `2xl:` (96rem); also `max-sm:`… and arbitrary `min-width(800px):` /
  `max-width(600px):`
- **Ancestor**: `dark:` / `light:`
- **Order**: `[media]:[ancestor]:[state...]:[pseudo-element]:property:value`;
  **multiple states must be alphabetical** (`focus:hover:…`), parser-enforced

**Modifier classes are rare in real code.** Responsive layout is done with
`@media` in `<style>`, and hover/focus states ride on stateful composites or
`<style>`. The system is correct and available; convention favors `<style>`
beyond an occasional one-off.

## Class Extraction

Classes are extracted by AST at build time from `class="..."`,
`class={[...]}` / `class={{...}}`, `class:name` directives, `clsx()` /
`cn()` / `cx()` / `classNames()` / `classnames()` calls, and variables named
`*class`/`*classes`/`*className(s)`/`*classList(s)`. CSS variables are
additionally caught by a `var(--name)` regex scan (unknown ones ignored),
which catches component props like `size="var(--icon_size_xs)"`.

For dynamically-constructed names, declare them:

```typescript
// @fuz-classes opacity:50% opacity:75% opacity:100%
// @fuz-elements button input textarea
// @fuz-variables shade_40 text_50
```

Auto-detected-but-unresolvable names are **silently skipped** (they may belong
to another framework); an explicit `@fuz-*` entry that can't resolve is an
**error** with typo suggestions. Outside fuz_css's own docs site, hints are
rarely needed.

## Dynamic Theming

**Runtime variable overrides**: components expose CSS variables as their
theming API. On elements use `style:`; on components the custom-property
shorthand (`style:` is invalid on component tags):

```svelte
<div style:--docs_menu_width={width}>
<PendingAnimation --font_size="var(--font_size_xl5)" />
```

**Color scheme** is a `dark`/`light` class on the root element (`style.css` has
`:root.dark { color-scheme: dark; }` / `:root.light { color-scheme: light; }`);
persistence and system preference live in fuz_ui's `ThemeState` / `ThemeRoot`.

**Themes**: `default_themes` registers `base` and `ledger`; low/high contrast
are `contrast_modifiers.low`/`.high` (a record), composed via
`compose_themes`; shipped-but-unregistered exemplars under `themes/` (`zine`, `pebble`, `parchment`, `phosphor`,
`guestbook`, `marquee`, `signage` — phosphor and marquee dark-only via
`scheme`) show the range. A `Theme` (from `@fuzdev/fuz_css/variable.ts`, a
strict schema) is a `name`, an optional `summary` for pickers, and
`StyleVariable` overrides (`variables`). A single-scheme `scheme` stance is
resolved with `resolve_theme_stance` (`theme_stance.ts`) before runtime
rendering. `render_theme_style()`
renders it into the `fuz.theme` layer, which beats `fuz.base` by layer order
regardless of specificity. `validate_theme` lints its shape and knobs, and
`check_theme` gates gamut, ramp monotonicity, and contrast at the default caps,
and `compile_theme` re-runs them with the theme's recomputed caps; either report
(`ThemeCheckReport`) answers `passed` (every evaluated gate passes) and
`complete` (nothing left unchecked) separately. The generators also take a build-time `theme`
option, the authored `Theme`, which derives the mirror and caps itself and
bakes the theme into the bundled CSS with no JS; the runtime `ThemeRoot`
path composes on top (runtime wins by layer order).

## Components

**Minimal custom CSS, delegating to fuz_css.** A large share of fuz_ui's
components — the styling-heaviest code in the ecosystem — have no `<style>`
block; application code is far more classless still. Where a `<style>` exists
it's short and component-specific: positioning, transitions, breakpoints,
parent-child selectors, all values from tokens.

```svelte
<!-- No <style> needed — semantic HTML + utility classes -->
<aside class="column gap_md">
	<h2>{title}</h2>
	<small class="text_50">{subtitle}</small>
	<p>{description}</p>
	<button class="palette_a">Confirm</button>
	<button class={['palette_c', { selected: destructive }]}>Delete</button>
</aside>
```

fuz_ui's `Details.svelte` and `EcosystemLinks.svelte` are real zero-`<style>`
examples.

### Anti-Patterns

```svelte
<!-- BAD: rebuilding what <small>/<aside> already do -->
<span class="subtitle">{text}</span>          <!-- GOOD: <small class="text_70"> -->
<div class="info-box">{message}</div>         <!-- GOOD: <aside> -->

<!-- BAD: manual flex in <style> -->
<div class="container">…</div>                <!-- GOOD: <div class="column gap_md"> -->
<style>.container { display: flex; flex-direction: column; gap: var(--space_md); }</style>

<!-- BAD: hand-rolled destructive button -->
<button class={['delete-btn', {active}]}>Delete</button>
<!-- GOOD: <button class={['palette_c', {selected: pending}]}>Delete</button> -->

<!-- BAD: hardcoded pixels -->
<style>.sidebar { width: 220px; padding-top: 40px; }</style>
<!-- GOOD: <style>.sidebar { width: var(--sidebar_width); padding-top: var(--space_xl2); }</style> -->
```

### When Custom CSS Is Justified

Complex interactive states (`.parent:hover .child` — fuz_ui's `Hashlink.svelte`
is the canonical reveal); structural behavior (`column-reverse` for bottom-up
scroll, sticky/absolute offsets); `@media` structural changes; animations and
transitions; rendering contexts (canvas, 3D); theming APIs for children
(`Alert.svelte` exposes `--text_color`). Still tokens, never hardcoded values.

### Class Naming

- **fuz_css tokens**: `snake_case` — `p_md`, `color_a_50`, `gap_lg`
- **Component-local classes**: `kebab-case` — `site-header`, `nav-links`

```svelte
<div class="column gap_md site-header">
	<nav class="row gap_sm nav-links">…</nav>
</div>

<style>
	.site-header { position: sticky; top: 0; z-index: 10; }
	.nav-links { border-bottom: var(--border_width_1) var(--border_style) var(--border_color); }
</style>
```

kebab-case for local classes is the **target**, adopted in zzz and fuz_ui; the
fuz_css and docs.fuz.dev sites still lean `snake_case` locally. New code uses
kebab-case.

## When to Use Classes vs Styles

| Need                                      | Utility class | Style tag       | Inline style   |
| ----------------------------------------- | ------------- | --------------- | -------------- |
| Simple layout (`row`, `column`, `gap_*`)  | **Preferred** | Overkill        | No             |
| Design tokens on own elements (1–4 props) | **Yes**       | OK              | OK             |
| Non-trivial own-element styling           | OK            | **Preferred**   | No             |
| Style child components                    | **Yes**       | No              | Limited        |
| Hover/focus/active state machines         | Limited       | **Preferred**   | No             |
| `@media` responsive layout                | Limited       | **Preferred**   | No             |
| Animations, transitions, keyframes        | No            | **Preferred**   | No             |
| Parent-child / sibling selectors          | No            | **Only option** | No             |
| Theming API (CSS vars consumers override) | No            | **Yes**         | Yes (override) |
| Runtime dynamic values                    | No            | No              | **Yes**        |

**Long class strings are a smell.** 4–6 classes is the comfortable upper
bound; 8+ (especially several literals) reads worse than the equivalent
`<style>` block with tokens.
