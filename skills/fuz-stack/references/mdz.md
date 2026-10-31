---
description: mdz dialect — grammar surface, component registration, rendering seam, autolink, preprocessor
---

# mdz — Strict Markdown Dialect

`mdz` (`@fuzdev/mdz`) is a deliberately small, unambiguous markdown grammar
aimed at devs and AI agents. An agent meets it in three places: **rendering
TSDoc prose** on docs sites (backticked identifiers linkify), **authoring
`<Mdz>` content** with embedded Svelte components, and **rendering streaming
LLM output**. One grammar, two parsers: sync `mdz_parse(content)` →
`Array<MdzNode>` (`@fuzdev/mdz/mdz.ts`, the normative reference) and the
incremental `MdzStreamParser` (emits opcodes); parity tests bind them.

**It is a dialect, not a CommonMark/GFM superset.** Design axiom: _false
negatives over false positives_ — ambiguous input stays literal text. Don't
assume a feature works because GFM has it; check the surface.

## Dialect surface

| Feature                | Syntax                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inline code            | `` `code` ``                                                                                                                                                                                                                                                             |
| Bold / italic / strike | `**bold**`, `_italic_`, `~~strike~~` — `**`/`~~` doubled; italic is single `_` at word boundaries (single `*`/`~` and intraword `_` are literal, so `snake_case` renders verbatim)                                                                                     |
| Links                  | auto-detected URLs, `/internal/path`, `./relative` / `../relative` (autolinked after whitespace), `[text](url)`                                                                                                                                                          |
| Headings               | `#`…`######` at **column 0**; slugified lowercase `id`                                                                                                                                                                                                                   |
| Lists                  | `- item` / `1. item` at column 0; indent nests; blank lines contained; items hold block children (paragraphs, nested lists, code blocks, blockquotes, tables) on indented lines — the marker-line remainder is inline-only                                                                                                             |
| Blockquotes            | `> ` per line (**no lazy continuation**); nest with `>>` or `> > `; bare `>` is the in-quote paragraph break; blank line ends the quote; content is a mini-document                                                                                                       |
| Code blocks            | fenced, optional language; an unclosed fence consumes to EOF (or the end of its blockquote)                                                                                                                                                                              |
| Horizontal rule        | `---` alone on a line                                                                                                                                                                                                                                                    |
| Tables                 | `\| a \| b \|` rows + `\| --- \| :-: \|` delimiter (colons set alignment); leading **and** trailing `\|` required; inline-only cells (`` `code` `` protects pipes; `\|` is the one escape); a header/delimiter column mismatch stays a paragraph                          |
| Components / elements  | `<Alert status="error">…</Alert>` (component) / `<aside class="box">…</aside>` (element) — **both must be registered**; `<br />` (registered) for a hard break. Attributes: quoted strings or bare booleans; elements filter to an inert allowlist, components pass all through as props |
| Paragraphs / breaks    | blank line separates; a single newline is a soft break (collapses to a space by default)                                                                                                                                                                                 |

**Whitespace**: text nodes preserve `\n` but default rendering applies no
`white-space` style. The `whitespace` prop on `Mdz`/`MdzStream`/`MdzPrecompiled`
takes any `MdzWhitespace` value — most commonly `pre-line` (every newline
breaks; chat input) or `pre-wrap` (spaces/tabs preserved too).

## Deliberately unsupported

- **No single-delimiter emphasis** — `*x*`, intraword `_x_`, `~x~` stay
  literal (intraword `_` literal so `snake_case` survives is a core reason the
  dialect exists).
- **No CommonMark/GFM compat** — no setext headings, reference links,
  `*`/`+` bullets, task lists.
- **No syntax highlighting, themed components, or HTML sanitization** — only
  registered components/elements render; rich rendering is injected, not built
  in.
- **Attribute grammar is strings + bare booleans.** Names are an ASCII letter
  followed by letters, digits, `-`, `_` (the tag-name charset); values are
  `"…"`/`'…'` (empty valid, `>` inside a quote is content, no escapes) or absent
  (`<input disabled />`); order preserved. Any malformed form bails the **whole
  tag** to literal text: unquoted values, `a={5}` (reserved, not evaluated),
  spaces around `=`, duplicate names, a newline/tab in the open tag, missing
  space between attributes, unterminated quote, dangling `=`. Directives,
  namespaces, spread, and `{shorthand}` can never parse (`:` and `{` aren't
  attribute-name/value chars). One shared helper
  (`mdz_filter_element_attributes`, used by `MdzNodeView`, `MdzStreamNodeView`,
  and `mdz_to_svelte`) enforces the policy at render and build time:
  **elements** keep only `class`, `title`, `lang`, `dir`, `role`,
  `aria-{label,hidden,describedby,labelledby}` — anything else is dropped in
  prod and DEV-warned by name, element still rendering; **components** receive
  every attribute as an untyped prop (`string | true`) — registering a component
  is the trust decision.

## Rendering: plain by default, inject richer

Core renders inline code as `<code>` and blocks as `<pre><code>`. Consumers
inject through getter contexts in `@fuzdev/mdz/mdz_contexts.ts`, set via
`MdzRoot` props or `mdz_set_context_with_fallback(context, () => Value)`
(prefers the local value, falls back to the ancestor's, captured once at init):

- `mdz_code_context` → `Component<{reference: string}>` for inline code —
  shaped to match fuz_ui's `DocsLink`
- `mdz_codeblock_context` → `Component<{lang, content}>` — shaped to match
  fuz_code's `Code`
- `mdz_components_context` → the `<Alert>`-style component registry (a `Map`)
- `mdz_elements_context` → the allowed-HTML-element registry
- `mdz_base_context` → base path for `./relative` links

**mdz ships no default registry** — every consumer registers its own; an
unregistered tag renders as a visible placeholder, not an error.

## Backticked-identifier autolinking (TSDoc)

There's no link syntax — the autolink is the injection seam plus a lookup.
fuz_ui injects `DocsLink` as `mdz_code_context`, so every inline code span
becomes a `DocsLink` whose `reference` is the span text; `DocsLink` resolves it
against `library_context`'s `Library` (`declaration_by_name.get`, then
`module_by_path.get`) — a hit renders `DeclarationLink`/`ModuleLink`, a miss
stays `<code>`. Only real API symbols resolve, which is why backticking
identifiers in TSDoc "just works" on docs sites and is inert elsewhere.
(`mdz_from_tsdoc` in `tsdoc_mdz.ts` converts TSDoc `@see`/`{@link}` text into
mdz strings — a source bridge, not the autolinker.)

## Build-time preprocessor

`svelte_preprocess_mdz` (`@fuzdev/mdz/svelte_preprocess_mdz.ts`) compiles
**static** `<Mdz content="…">` usages — string literals and statically
resolvable ternary chains — into pre-rendered `<MdzPrecompiled>` markup at
build time; dynamic content is left alone. Its `code_component_import` /
`codeblock_component_import` (plus `components`/`elements`) options mirror the
runtime seam so output stays identical. Use it for docs sites with many static
blocks; skip it for dynamic content.

## Sync vs streaming

The **sync** pipeline (`mdz_parse`, `Mdz.svelte`) owns random-access input —
anything held as a complete string. The **streaming** pipeline
(`MdzStreamParser`, `MdzStream.svelte` fed by an `MdzStreamState`) owns
append-only chunks (LLM output) with the invariant of no implicit re-parsing —
corrections to emitted output are bounded, local, and reified as opcodes. Use
streaming only when genuinely rendering partial input as it arrives.

## Testing

Fixture-based (`fixtures/mdz/`, `fixtures/svelte_preprocess_mdz/`) — the
fixtures are ground truth for what parses; regenerate via
`gro task src/test/fixtures/mdz/update.task.ts`, never hand-edit `expected.json`
(./testing-patterns.md §Fixture-Based Testing).
