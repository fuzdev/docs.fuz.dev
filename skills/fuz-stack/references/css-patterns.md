---
description: fuz_css styling — default-reliance, the styling ladder, tokens, class rules, extraction
---

# CSS Patterns

fuz_css is three parts: **semantic styles** (classless element defaults),
**style variables** (design tokens as CSS custom properties), and **utility
classes** generated per project from the classes it uses. This page is how to
style with it and what goes wrong. The catalogs (every variable family,
class, modifier, and plugin option) are fuz_css's `CLAUDE.md` and its docs
site.

## Default styling is the baseline

**The most common mistake is styling what fuz_css already styles.** Headings
are tiered, form controls share sizing and states, `<aside>` is a callout,
and **block elements space themselves**: `p`, `ul`, `ol`, `menu`, `form`,
`fieldset`, `table`, `details`, `textarea`, `select`, `label`, `pre`,
`blockquote`, `aside`, `nav`, and `legend` each get
`margin-bottom: var(--flow_margin, var(--space_lg))` unless `:last-child` or
`.unstyled`, and headings and `section` take multiples of it. A heading over
prose over a list has correct rhythm with no classes.

```svelte
<!-- BAD: headings and paragraphs already carry flow margin -->
<h2 class="mb_md">{title}</h2><p class="mb_md">{body}</p>
<!-- GOOD -->
<h2>{title}</h2><p>{body}</p>
```

Before adding a class or a `<style>` block, name the gap in the defaults it
closes. Reach past the defaults for layout (flex rows and columns, grids),
intent color (`palette_c` on a destructive button), and behavior specific to
the component.

- **`row` and `row_wrap` zero their children's margins**, so space them with
  `gap_*`.
- **`column` does not.** Its children keep their flow margins, so a `gap_*`
  on a `column` is added to them: a paragraph, list, or label sits a gap
  further from the next child than a `div` beside it does, and a heading's
  top margin stops collapsing into the margin above it. A vertical stack of
  flow elements needs no class. `column` and `gap_*` are for children with
  no margin of their own (`div`s, buttons, inputs); a flow element that has
  to sit in one takes `mb_0` (`my_0` on a heading).
- **A list item carries its own margin** in a styled `ul`, `ol`, or `menu`,
  and resetting the list's `list-style`, `padding`, and `margin` leaves it
  in place. A list laid out as a stack takes `unstyled`:
  `<ul class="unstyled column gap_xs">`.
- **`fieldset` is already a flex column**, so `column` adds nothing to it
  and a `gap_*` is added to its labels' margins the same way.
- **A heading that opens a padded box** (`.panel`, `.pane`, `aside`, `li`,
  `blockquote`, `fieldset`, `dialog`, a table cell) drops its top margin.
- **Density is one class**: a size composite on a container (§Composites)
  rescales the controls and the rhythm together.

## The styling ladder

Stop at the first rung that suffices:

1. **Semantic HTML**: the right element, no class.
2. **Built-in conventions**: `.selected`, `.disabled`, `.palette_a` to
   `.palette_j`, `.inline`, `.unstyled`, and the ARIA states.
3. **Composite classes**: `row`, `column`, `box`, `panel`, `chip`, `plain`,
   `ellipsis`.
4. **Token and keyword classes**: `p_md`, `gap_lg`, `color_a_50`, `flex`.
5. **Literal classes**: `justify-content:space-between`, `width:100%`.
6. **A `<style>` block** with design tokens.

Rungs 3 to 5 are one tier and mix freely on an element. The real cuts are
rung 1 against the rest, and classes against `<style>`.

- **A composite only when one matches exactly** (`row` over
  `flex align-items:center`).
- **A token, keyword, or literal class beats a composite on the same
  property**, modified or not: composites render in a lower sublayer.
- **Never hardcode a spacing or color value**, in a class or in `<style>`.
- **The ladder is for authoring, not for rewriting.** Moving styling up
  (`<div class="callout">` to `<aside>`) is good. Turning a working `<style>`
  block into a long class string is churn: state machines, animations,
  `@media`, parent-child selectors, and positioning stay in `<style>`.

| Need                                       | Use                                  |
| ------------------------------------------ | ------------------------------------ |
| Layout, spacing, a token on one element    | classes                              |
| Styling a child component                  | classes, or `--prop` (§Components)   |
| Hover, focus, and active state machines    | `<style>`                            |
| `@media` layout, animations, keyframes     | `<style>`                            |
| Parent-child and sibling selectors         | `<style>`                            |
| A value computed at runtime                | `style:` (§Components)               |

## What the elements give you

Beyond the obvious (links, buttons, inputs, tables, `<code>`, `<pre>`): `<aside>`
is a bordered, tinted callout; `<blockquote>` has its rule and padding;
`<small>` is `--font_size_sm`; `<kbd>` and `<samp>` are mono; `<hr>` is themed;
`<details>` and `<summary>` have their affordances; a `.title` inside a
`<label>` is the field's label; `<fieldset>` is a flex column; media elements
are `display: block` and `max-width: 100%`. A form control inside a `<p>` goes
inline on its own.

All of it sits in low-specificity `:where()` selectors in the lowest cascade
layer, so a utility class or any unlayered style overrides it regardless of
import order. Two `!important` declarations hold against everything:
`[hidden]`'s `display: none`, and the `prefers-reduced-motion` reset of the
`duration_*` tokens (set a duration on the element that needs one).

**State and variant classes the semantic styles recognize**:

| Class                      | Applies to                                       | Effect                                                         |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| `.selected`                | `button`, `a`, `label`, `.menuitem`, `.selectable` | selected look; `button` and `label` also go `cursor: default` |
| `.deselectable`            | a selected `button`, `.selectable`, `.menuitem`  | keeps the selected element interactive                         |
| `.disabled`                | `label`                                          | muted, default cursor                                          |
| `.palette_a` to `.palette_j` | `button`, `.chip`                              | hue variants (`a` accent, `b` positive, `c` negative)          |
| `.inline`                  | `button`, `input`, `select`, `textarea`, `code`  | inline-block inside text                                       |
| `.unstyled`                | most elements                                    | drops the opinionated styling, keeps the normalization         |

**ARIA states are styled too, and are the accessible form**: `aria-pressed`
gives a button the selected look, `aria-current` marks the current link,
and `aria-disabled` and `aria-invalid` have their states. Prefer them where
the attribute is true of the element.

## Setup

```typescript
// src/routes/+layout.svelte
import 'virtual:fuz.css'; // generated: base styles, the variables used, the classes used
import '@fuzdev/fuz_code/theme.css'; // a package's own theme, if any
import './style.css'; // the project's global styles, if any
```

```typescript
// vite.config.ts
import { vite_plugin_fuz_css } from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
export default defineConfig({ plugins: [sveltekit(), vite_plugin_fuz_css()] });
```

```typescript
// src/app.d.ts
declare module 'virtual:fuz.css' {
	const css: string;
	export default css;
}
```

- The plugin returns several plugin objects. Pass its result to `plugins` as
  is.
- The declaration needs a script file: an `app.d.ts` with a top-level
  `import` or `export` turns `declare module` into an augmentation. Keep
  `app.d.ts` free of them or use a separate `.d.ts`.
- **Markup that arrives at runtime isn't seen by extraction.** A site that
  renders markdown or other generated HTML passes
  `additional_elements: 'all'` (mdz's docs site does) and declares any classes
  that markup needs (§Extraction).
- **`src/routes/style.css` stays near-empty**: element overrides, app layout
  variables (sidebar widths), and patterns that recur across the app's
  components but aren't general enough for fuz_css. Mark a candidate
  `/* TODO upstream */`.

## Tokens

- **`text_*` and `shade_*` first.** They are the opaque, scheme-adaptive
  scales for text and surfaces. `ink_*` and `paper_*` are alpha overlays that
  accumulate when nested; they are variables only, reached through a literal
  (`background-color:var(--ink_10)`). `bg_*` classes are always opaque.
- **An intent token when the color carries meaning**: `positive_50`,
  `bg_caution_10`, `border_negative_50` over the palette letters. Buttons and
  chips stay on `.palette_a` to `.palette_j`: there is no `.negative` class.
- **Scales run from the background outward**: stop `00` is nearest the
  ground, `50` the base, `100` the highest contrast, in both color schemes.
- **Many token classes also set a custom property that descendants read**:
  `font_size_lg` sets `--font_size`, `color_a_50` sets `--text_color`,
  `border_color_30` sets `--border_color`, `outline_a_50` sets
  `--outline_color` (focus rings follow it).
- **Never hand-write a `rem` font size.** fuz_css sets a 62.5% root, so
  `0.85rem` is 8.5px. Every `rem` in a rule scales that way (`16rem` is
  160px), but a `@media` query's `rem` is the browser's 16px. Use tokens, and
  when a hand-written length is unavoidable pick the unit knowing which it
  gets.
- **A width cap is a distance class**: `width_atmost_md` is `width: 100%`
  with a `max-width` from the distance scale. Space-scale sizes and offsets
  are literals (`width:var(--space_md)`).

## Classes

Four kinds, found by scanning source (§Extraction):

| Kind      | Example                              | What it is                          |
| --------- | ------------------------------------ | ----------------------------------- |
| Token     | `p_md`, `color_a_50`, `gap_lg`       | maps to a style variable            |
| Keyword   | `flex`, `sticky`, `uppercase`        | a CSS keyword that names its property |
| Composite | `row`, `box`, `ellipsis`             | several declarations                |
| Literal   | `align-items:center`, `opacity:80%`  | any `property:value`                |

**A class name earns its place** by being token-backed, by completing a
token family's steps (`gap_0`, `mx_auto`), by bundling declarations, or by
being a CSS value keyword that belongs to one property (`flex`, `sticky`,
`italic`). A keyword shared between properties (`center`, `nowrap`, `none`)
stays a literal (`align-items:center`), and so does any other single
declaration: `flex:1`, `width:100%`, `border-radius:50%`. Don't coin a name
for one declaration; `hidden` is the one exception fuz_css makes. A Tailwind
name (`items-center`) generates nothing, silently.

### Composites

- **Layout**: `row` (flex row, items centered), `row_wrap`, `column` (flex
  column), `box` (flex column, centered both ways). `flex` alone is only
  `display: flex`.
- **Surfaces and controls**: `panel` (tinted, embedded container), `pane`
  (opaque, floating container), `chip`, `plain` (a control with a
  transparent border whose fill and shadow show only on hover), `selectable`,
  `clickable`, `menuitem`, `icon_button`, `ellipsis`, `sr_only`.
- **Composites with rulesets already include their states.** `hover:` on
  `clickable`, `selectable`, `menuitem`, or `plain` is redundant.
- **Size composites cascade.** `sized_xs` to `sized_xl` on a container
  rescale `--font_size`, `--input_height`, `--icon_size`, padding, and
  `--flow_margin` for the subtree, so a `sized_sm` panel gets tighter
  controls, icons, and rhythm together. Headings and prose keep their sizes.
  `sized_md` resets inside a sized parent.

### `hidden`

`hidden` is `display: none` as a class, for the modifiers the attribute can't
take (`max-md:hidden`, `print:hidden`). Hiding by state is the `hidden`
attribute's job (`hidden={!open}`), and the attribute beats every class. The
class beats a display class beside it (`flex hidden` hides) and loses to a
`display` set in the component's `<style>`.

```svelte
<nav class="max-md:hidden row"> <!-- hidden below md, a row from md up -->
<nav class="hidden md:flex"> <!-- hidden until md, then flex -->
```

**Trap**: `hidden md:row` stays hidden at every width. `row` is a composite,
so even modified it loses to `hidden`. Put the modifier on the
single-purpose class: `max-md:hidden row`.

### Literals

`property:value` maps to the declaration. `~` stands for a space, and `calc`
needs `~` around `+` and `-`:

```svelte
<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)">
<div class="width:calc(100%~-~20px)">
```

More than two or three `~` means a `<style>` block. A custom-property literal
(`--flow_margin:0`, `--button_shadow:none`) reaches any variable hook an
element reads.

### Modifiers

Any class takes prefixes for a breakpoint (`md:`, `max-md:`), a color scheme
(`dark:`), a state (`hover:`), or a pseudo-element (`before:`), in that
order, with several states in alphabetical order (`focus:hover:`). Outside
fuz_css's own docs, the stack's code uses none: responsive layout is `@media`
in `<style>`, and states ride on the stateful composites. Reach for a
modifier for a one-off (`max-md:hidden`), not as a system.

## Extraction

The plugin reads classes from the AST: `class="…"`, `class={[…]}`,
`class={{…}}`, `class:name`, `clsx()` and `cn()` calls, and variables or
object keys whose names end in `class`, `classes`, `class_name(s)`, or
`class_list(s)`. CSS variables are also caught by a `var(--name)` scan, which
finds them in props such as `size="var(--icon_size_xs)"`.

A name built at runtime isn't found. Declare it:

```typescript
// @fuz-classes opacity:50% opacity:75% opacity:100%
// @fuz-elements button input textarea
// @fuz-variables shade_40 text_50
```

An auto-detected name that doesn't resolve is skipped silently (it may be
another framework's), with a warning if it is shaped like a literal or a
modifier. A `@fuz-*` entry that doesn't resolve is an error with suggestions.

## Components

Most components need little or no `<style>`. Where one exists it is short
and specific to the component: positioning, transitions, breakpoints,
parent-child selectors, with every value a token.

```svelte
<section>
	<h2>{title}</h2>
	<p>{description}</p>
	<div class="row gap_sm">
		<button type="button" class="palette_a">Confirm</button>
		<button type="button" class="palette_c">Delete</button>
	</div>
</section>
```

- **Local classes are `kebab-case`** (`site-header`); fuz_css's own names are
  `snake_case`. fuz_css's and docs.fuz.dev's sites still have `snake_case`
  local classes; new code uses kebab.
- **A local class never takes a fuz_css class name.** Extraction finds
  classes by name, so a local `.row`, `.panel`, `.chip`, `.block`, `.grid`,
  `.fixed`, `.bold`, or `.hidden` in markup also gets fuz_css's rule, and
  `.title`, `.selected`, and `.inline` meet the base styles. Kebab case
  doesn't save `inline-flex` or `line-through`, which are keyword classes.
- **Conditional classes**: `class:name={cond}` for one toggle, which the
  shared lint config prefers to a ternary in the class string; an array or
  object (`class={['card', size, {active}]}`) when composing several.
- **A component's theming API is its CSS variables.** Set one on an element
  with `style:--name={value}` and on a component with the shorthand
  `<PendingAnimation --font_size="var(--font_size_xl5)" />`, since `style:` is
  invalid on a component tag. Document them with `@cssprop`, as fuz_ui's
  `PendingAnimation.svelte` does.
- **A scoped selector doesn't reach a child component's root.** A parent's
  `.list > *` or `.list > .item` matches nothing a child component renders.
  The compiler warns only when nothing in the parent's own markup matches
  either, so a list that mixes elements and components fails silently. Pass
  a class or a variable, or write `.list > :global(*)`.
- **Reveal-on-hover and other parent-driven states** are the standard reason
  for a `<style>` block: fuz_ui's `TomeSectionHeader.svelte` shows its
  hashlink with `:hover :global(.hashlink)`.

### Anti-patterns

```svelte
<!-- BAD: rebuilding what <small> and <aside> do -->
<span class="subtitle">{text}</span> <!-- GOOD: <small class="text_70"> -->
<div class="info-box">{message}</div> <!-- GOOD: <aside> -->

<!-- BAD: a flex column in <style> around flow content -->
<div class="container"><h2>…</h2><p>…</p></div> <!-- GOOD: no wrapper class at all -->
<style>.container { display: flex; flex-direction: column; gap: var(--space_md); }</style>

<!-- BAD: a hand-rolled destructive button -->
<button class="delete-btn" class:active>Delete</button>
<!-- GOOD: <button class="palette_c" class:selected={pending}>Delete</button> -->

<!-- BAD: hardcoded pixels -->
<style>.sidebar { width: 220px; padding-top: 40px; }</style>
<!-- GOOD: <style>.sidebar { width: var(--sidebar_width); padding-top: var(--space_xl2); }</style> -->
```

## Themes and color scheme

The color scheme follows the OS in plain CSS, and a `dark` or `light` class on
the root overrides it. fuz_ui's `ThemeRoot` renders the selected theme and
persists the theme and scheme; a bare `<ThemeRoot>` in the root layout is the
whole setup for most apps. An app that ships a single-scheme theme passes
`resolve_theme={resolve_theme_stance}`. Authoring themes, the contrast knob,
the build-time `theme` option, and the theme checks are fuz_css's
`CLAUDE.md` and `ThemeRoot`'s prop docs.
