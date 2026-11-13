---
description: mdz dialect — what parses, authoring traps, the rendering seam, autolinks, preprocessor
---

# mdz — Strict Markdown Dialect

`mdz` (`@fuzdev/mdz`) is a small, unambiguous markdown grammar. You meet it in
three places: **TSDoc prose** rendered on docs sites, **`<Mdz>` content**
with embedded Svelte components, and **streamed LLM output**. One grammar, two
parsers that tests hold to each other: `mdz_parse(content)` returns an
`Array<MdzNode>` (`@fuzdev/mdz/mdz.ts`), and `MdzStreamParser` emits opcodes
for input that arrives in chunks.

**It is a dialect, not a CommonMark or GFM superset.** The design rule is
_false negatives over false positives_: ambiguous input stays literal text.
Don't assume a feature because GFM has it.

## What parses

| Feature                | Syntax                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Inline code            | a span between single backticks, on one line                                                                                           |
| Bold / italic / strike | `**bold**`, `_italic_`, `~~strike~~`                                                                                                   |
| Links                  | URLs, `/internal/path`, `./relative` and `../relative` (autolinked after whitespace), `[text](url)`                                    |
| Headings               | `#` to `######` at column 0, with a slugified `id`                                                                                     |
| Lists                  | `- item` and `1. item` at column 0; indent nests; block children go on indented lines                                                  |
| Blockquotes            | `> ` on every line; nest with `>>`; a bare `>` is the paragraph break inside a quote                                                   |
| Code blocks            | fenced, optional language; an unclosed fence runs to the end                                                                           |
| Horizontal rule        | `---` alone on a line                                                                                                                  |
| Tables                 | rows with a leading and a trailing pipe, and a `---` delimiter row whose colons set alignment; cells are inline-only                   |
| Components / elements  | `<Alert status="error">…</Alert>`, `<aside class="box">…</aside>`, when registered                                                    |
| Paragraphs             | a blank line separates; a single newline is a soft break                                                                               |

The full grammar is mdz's `CLAUDE.md`, and its fixtures are the ground truth
for what parses.

## Authoring traps

- **Italic is a single `_` at word boundaries.** Single `*` and `~` are
  literal, and so is an intraword `_`, which is why `snake_case` renders as
  written. A `_` at a word boundary does open italic, and it can run across
  a code span to the next boundary `_`: backtick identifiers that begin or
  end with an underscore.
- **`*` and `+` are not bullets**, and there are no task lists, setext
  headings, or reference links.
- **A blockquote has no lazy continuation.** A line without `>` ends it.
- **A table row needs both outer pipes.** A header and delimiter that
  disagree on column count stay a paragraph. Inside a cell, inline code
  protects a pipe, and backslash-pipe is the one escape.
- **A bare path is a link** (see ./path-references.md): `./x` and `../x`
  after whitespace, and `/word` too. Backtick a path that is only an example,
  and backtick an HTTP route (`POST /login`), which would otherwise
  become a link to a page that doesn't exist.
- **A path keeps a `'`, `*`, `_`, or `~` that follows it.** `./foo.md's`
  links to a file ending in `'s`, and a closing `**` or `_` directly after a
  path joins the link (`**see ./foo.md**` leaves the bold open). Put a space
  or a word after the path, or reword. Sentence punctuation after a path is
  trimmed and is fine.
- **A wrapped line that starts with a block marker becomes a block.** When
  hard-wrapping prose, don't let a line begin with `- `, `1. `, `#`, or `>`.
- **A code span can't cross a line break**, and there are no double-backtick
  spans. Keep a span on one line.
- **A path directly after `(` doesn't link.** Write `(see ./x.md)`.
- **A tag that fails to parse stays literal, whole.** Attribute values are
  quoted strings or absent (`<input disabled />`). An unquoted value,
  `a={5}`, spaces around `=`, a duplicate name, or a newline inside the open
  tag sends the entire tag to text.
- **An unregistered tag renders a visible placeholder**, not an error. mdz
  ships no default registry.

## Attributes are filtered

- **Elements** keep only `class`, `title`, `lang`, `dir`, `role`, and
  `aria-label`, `aria-hidden`, `aria-describedby`, `aria-labelledby`.
  Anything else is dropped, with a DEV warning naming it.
- **Components receive only the attributes named in their registered
  `props`.** A bare registry entry gets none, and `props: 'all'` passes every
  attribute, as an untyped `string | true`. Registering a component is the
  trust decision; naming its props is what it is prepared to receive.

mdz does no HTML sanitization beyond this: only registered tags render.

## Rendering: plain by default, inject richer

Core renders inline code as `<code>` and blocks as `<pre><code>`. A consumer
injects richer renderers through getter contexts in
`@fuzdev/mdz/mdz_contexts.ts`, set by `MdzRoot` props or by
`mdz_set_context_with_fallback(context, () => value)`:

- `mdz_code_context`: a component for inline code, taking `{reference}`.
  fuz_ui's `DocsLink` fits it.
- `mdz_codeblock_context`: a component taking `{lang, content}`. fuz_code's
  `Code` fits it.
- `mdz_components_context` and `mdz_elements_context`: the registries, each
  component entry a component or `{component, props}`.
- `mdz_base_context`: the base for `./relative` links, also the `base` prop
  on `Mdz`.

Newlines are kept in text nodes and collapse by default. The `whitespace`
prop on `Mdz`, `MdzStream`, and `MdzPrecompiled` sets `pre-line` (every
newline breaks, for chat input) or `pre-wrap`.

## Backticked identifiers become API links

mdz has no syntax for this. On an API docs page fuz_ui injects `DocsLink` as
the inline-code renderer, and `DocsLink` looks the span's text up in the
`Library` in context: a declaration name or a module path renders a link, and
anything else stays `<code>`. So backticking an identifier in TSDoc links it
on the API pages and is inert everywhere else, a tome page included, unless
the page injects `DocsLink` as `mdz_code_context` itself.

## Static content compiles at build time

`svelte_preprocess_mdz` (`@fuzdev/mdz/svelte_preprocess_mdz.ts`) compiles
`<Mdz content="…">` with a string literal, or a ternary of them, into
`<MdzPrecompiled>` markup. Dynamic content is left for the runtime. Its
`components`, `elements`, and code-component options mirror the runtime seam
so both render the same. Use it on a docs site with many static blocks.

## Sync or streaming

`mdz_parse` and `Mdz.svelte` are for input you hold as a whole string.
`MdzStreamParser` and `MdzStream.svelte` are for append-only chunks: they
never re-parse, and a correction to what was already emitted is a bounded,
local opcode. Use streaming only when rendering partial input as it arrives.
