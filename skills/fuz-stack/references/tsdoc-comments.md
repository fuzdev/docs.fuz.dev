---
description: TSDoc style — what to write, tag forms, linking, where tags are dropped, drift
---

# TSDoc Comments

Doc comments are extracted by `svelte-docinfo` and rendered on each
project's API docs through mdz. Write standard JSDoc with the tags below and
backtick every identifier.

## What to write

**Say why, not what.** Don't restate the name and the types. Explain why the
thing exists, what depends on it, and what a caller would get wrong.

```typescript
// Weak: restates the name
/** Creates a new session. */

// Strong: purpose and rationale
/**
 * Predicts the next version by analyzing all changesets in a repo.
 *
 * Critical for dry-run mode accuracy — allows simulating publishes without
 * actually running `gro publish` which consumes changesets.
 *
 * @returns predicted version and bump type, or null if no changesets
 */
```

- **Name the algorithm** so a reader can look it up ("Kahn's algorithm, with
  alphabetical order within a tier for determinism").
- **A long description is earned** by security or invariant rationale:
  ordering, fail-closed behavior, a race that was closed.
- **Non-obvious semantics go on the symbol, not in a `CLAUDE.md`.** Wire
  shapes, invariants, and failure modes live in TSDoc, where they are visible
  during the edit. A `CLAUDE.md` entry is a one-line pointer.

**Cut what adds nothing.** A wrong or empty comment costs more than none.

- **`@param x - the x`.** Keep a `@param` only for what the name and type
  don't say: a format, a constraint, an edge case.
- **A `@returns` that repeats the summary sentence.** Pick one.
- **A helper's contract restated at every caller.**
  `@throws Error if the INSERT returns no row` belongs on `assert_row`, not on
  each query that calls it. The same goes for errors any call could raise (the
  driver's syntax errors).
- **`@mutates` that mirrors the function name.** `set_session_cookie` doesn't
  need "writes the `Set-Cookie` header".
- **Narration of obvious steps, and hedges**: "simply", "just",
  "essentially", "should never happen".

## Tags

| Tag | Form |
| --- | --- |
| `@param` | `@param name - description`, in parameter order; `@param options.field - …` for a property |
| `@returns` | not `@return`; for an async function, what the promise resolves to |
| `@throws` | `@throws ErrorType description`, the type first, even when it is `Error` |
| `@mutates` | `@mutates target - description` (stack-specific) |
| `@example` | a fenced code block; `// =>` comments for results |
| `@default` | on an interface field or component prop |
| `@see` | the reference first, then prose (§Links) |
| `@cssprop` | `@cssprop --name - description`, in a component's doc comment |
| `@internal` | not stable API; stays documented, with a note on who uses it |
| `@nodocs` | removed from docs and from the flat-namespace check (stack-specific) |
| `@module` | marks a module comment; the last line of the block |

**Order**: description, `@param`, `@returns`, `@mutates`, `@throws`,
`@example`, `@deprecated`, `@see`, `@since`, `@default`, `@internal`,
`@nodocs`.

- **A destructured parameter can't be documented**, since tags match by
  parameter name and TS names it `__0`. Name the parameter.
- **`@throws` reads its first word as the type**, and needs a description
  after it. `@throws if the file is missing` records `if` as the type, a
  backticked type isn't read as one, and a lone `@throws Error` records no
  type. A hyphen after the type is fine (`@throws Error - if …`, gro's
  form).
- **`@mutates` names what a reader wouldn't guess**: the columns, the
  cascade, the side channel.

  ```typescript
  /** @mutates `app_settings` row - sets `open_signup`, `updated_at`, `updated_by` */
  /** @mutates `permit_offer` siblings - stamps `superseded_at` on every other pending offer for the tuple */
  ```

  On a class, `add`, `remove`, and `set` mutate by design and need no tag.
  Tag the surprising ones: a query-shaped method that reorders (`LruMap.get`),
  a setter that also invalidates caches, a `spawn` that also records the
  child.
- **`@nodocs` is for exports the docs shouldn't list**: plumbing exported
  only because modules import by path, and the `task`, `Args`, and `gen`
  exports every task and gen file shares. Never put it on a symbol consumers
  import: rename one side of a collision (see SKILL.md's flat-namespace
  rule).
- **`@internal` says who uses it**:
  `/** @internal Used by the test harnesses — not stable API. */`
- **`@deprecated` is rare.** With no backwards compatibility, deprecated code
  is deleted.
- **`@example` shows the common case first** and a result. A bare call with
  no visible output teaches nothing.

## Links

**Backtick every identifier, module path, and type name.** On an API docs
page a backticked name that matches a declaration or module becomes a link;
anything else stays code (see ./mdz.md).

- **No `{@link}`.** An identifier is backticked. A URL is written bare, or
  as a markdown link when it needs text:
  `[svelte-docinfo](https://github.com/fuzdev/svelte-docinfo)`. An inline
  `{@link}` is kept raw: its braces and `@link` show as text.
- **A module is its `src/lib`-relative path with the source extension**:
  `actions/action_rpc.ts`. A `./` prefix, a `.js` extension, a
  `src/lib/` prefix, or the bare filename of a nested module all miss
  silently. A top-level module is its filename.
- **A `@see` opens with its reference**, backticked like any other
  identifier, then prose. A URL or a markdown link can open one too.

  ```typescript
  /**
   * @see `each_concurrent` for the side-effect variant
   * @see `actions/action_rpc.ts` for the JSON-RPC dispatcher
   * @see https://fuz.dev for the project
   * @see [svelte-docinfo](https://github.com/fuzdev/svelte-docinfo) for the analysis library
   */
  ```
- **Backtick an HTTP route**: `POST /login`. A bare `/login` after a
  space is an internal link, and a link to a page that doesn't exist fails
  the prerender.
- **Links work in descriptions, `@param`, `@returns`, `@example`, and
  `@see`.** `@throws`, `@mutates`, `@deprecated`, `@internal`, and `@since`
  render as plain text, backticks included. Backtick there anyway, for the
  reader of the source, except the type that opens a `@throws`, which is a
  bare word.
- **Never point outside the repo.** Published API docs stand alone, so a
  `../other-repo` path is dead (see ./path-references.md). Credit outside
  work in prose or with a URL.

## Where a tag is dropped

svelte-docinfo's `CLAUDE.md` has the full rules. The ones that bite:

- **On an overloaded function, symbol-level tags go on the first overload
  signature.** `@example`, `@throws`, `@see`, and the rest are discarded on
  any other signature, and a comment on the implementation signature is
  hidden entirely. `@param` and `@returns` are per signature.
- **A module comment keeps prose, `@example`, `@see`, `@deprecated`,
  `@since`, and `@internal`.** Declaration tags in it are dropped, `@nodocs`
  included: leave a module out with the analyzer's `exclude` patterns.
- **`@nodocs` works on top-level declarations and export statements**, not on
  a member or a prop.
- **`@default` is dropped on a top-level function.**
- **An unknown tag is dropped silently.**

## Modules and components

A module comment ends with `@module`. Write one where a module has design
rationale, pipeline stages, or relationships a reader needs first; use `##`
headings inside a long one.

A component documents itself in an HTML comment that starts with
`@component`, with its `@cssprop` lines, and documents each prop inline in
the `$props()` type:

```svelte
<!-- fuz_ui Dialog.svelte (excerpt) -->
<script lang="ts">
	const {
		align = 'center',
		dismissable = true,
		...rest
	}: Omit<SvelteHTMLElements['dialog'], 'children' | 'onclose'> & {
		/**
		 * How the content is aligned in the viewport. `center` vertically centers it;
		 * `top` aligns it to the top and grows downward, which avoids jank when the
		 * content's height changes.
		 * @default 'center'
		 */
		align?: DialogAlign;
		/**
		 * Whether clicking outside the content (see `content_selector`) closes the
		 * dialog. `Escape` closes it regardless of this.
		 * @default true
		 */
		dismissable?: boolean;
	} = $props();
</script>
```

An obvious prop needs no comment. For a prop with a destructuring default,
the generated docs show the code's default and ignore the tag, so a
`@default` beside it is for readers of the source and must be kept matching.

## Drift

**A wrong doc comment is worse than a missing one**: readers trust it. When
a public signature changes, reread the TSDoc of every symbol touched.

- **`@throws` against the return shape**: the tag says it throws and the body
  returns `null` on that path, or the reverse. Callers branch on this.
- **Parameters renamed or reordered**, with `@param` left behind.
- **A returned type that grew fields** nobody documented.
- **A thrown class that was replaced** while `@throws` names the old one.
- **A `@see` to a module that moved.**
